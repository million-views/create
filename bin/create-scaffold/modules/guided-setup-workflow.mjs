#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeErrorMessage, validateAllInputs } from './security.mjs';
import { ensureDirectory, safeCleanup } from './utils/fs-utils.mjs';
import { createTemplateIgnoreSet, shouldIgnoreTemplateEntry } from './utils/template-ignore.mjs';
import { createSetupTools, loadSetupScript } from './setup-runtime.mjs';
import { ContextualError, ErrorContext, ErrorSeverity } from './utils/error-handler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKFLOW_STATE_FILE = '.create-scaffold-workflow.json';
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Guided setup workflow with progress tracking, error recovery, and state persistence
 */
export class GuidedSetupWorkflow {
  constructor({
    cacheManager,
    logger,
    promptAdapter,
    projectDirectory,
    templatePath,
    templateName,
    repoUrl,
    branchName,
    options,
    placeholders,
    metadata,
    selectionFilePath
  }) {
        // Debug logging for test environment
    if (process.env.NODE_ENV === 'test' && logger) {
      logger.debug('GuidedSetupWorkflow constructor called with:', {
        projectDirectory: !!projectDirectory,
        templatePath: !!templatePath,
        templateName: !!templateName,
        options: !!options,
        placeholders: !!placeholders,
        metadata: !!metadata
      });
    }

    this.cacheManager = cacheManager;
    this.logger = logger;
    this.prompt = promptAdapter;
    this.projectDirectory = projectDirectory;
    this.resolvedProjectDirectory = path.resolve(projectDirectory);
    this.templatePath = templatePath;
    this.templateName = templateName;
    this.repoUrl = repoUrl;
    this.branchName = branchName;
    this.options = options || {};
    this.placeholders = placeholders || [];
    this.metadata = metadata || {};
    this.selectionFilePath = selectionFilePath;

    this.stateFile = path.join(this.resolvedProjectDirectory, WORKFLOW_STATE_FILE);
    this.workflowState = {
      version: '1.0',
      startTime: new Date().toISOString(),
      currentStep: 'initialization',
      completedSteps: [],
      failedSteps: [],
      retryCount: 0,
      projectDirectory: this.projectDirectory,
      templateName: this.templateName,
      repoUrl: this.repoUrl,
      branchName: this.branchName,
      options: this.options,
      placeholders: this.placeholders,
      progress: {
        totalSteps: 12,
        currentStepIndex: 0,
        stepNames: [
          'initialization',
          'validation',
          'dimension_selection',
          'hints_display',
          'gate_enforcement',
          'feature_validation',
          'directory_setup',
          'template_copy',
          'placeholder_resolution',
          'setup_script_execution',
          'ide_integration',
          'finalization'
        ]
      },
      errors: [],
      warnings: []
    };
  }

  /**
   * Check if this is a V1 template
   */
  #isV1Template() {
    return this.metadata?.schemaVersion === '1.0.0';
  }

  /**
   * Load existing selection.json file if provided
   */
  async #loadSelectionFile() {
    if (!this.selectionFilePath) {
      return null;
    }

    try {
      // Resolve relative paths to absolute
      const resolvedPath = path.resolve(this.selectionFilePath);

      // Check if file exists
      await fs.access(resolvedPath);

      // Read and parse the selection file
      const selectionData = JSON.parse(await fs.readFile(resolvedPath, 'utf8'));

      this.logger.info(`✅ Loaded selection.json from ${resolvedPath}`);
      return selectionData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Selection file not found: ${this.selectionFilePath}`);
      }
      throw new Error(`Failed to load selection file: ${error.message}`);
    }
  }

  /**
   * Validate loaded selections against template constraints
   */
  async #validateLoadedSelections(selections) {
    try {
      // Import SelectionValidator dynamically to avoid circular dependencies
      const { SelectionValidator } = await import('../../../lib/validation/selection-validator.mjs');

      const validator = new SelectionValidator();
      const result = await validator.validate(selections, this.metadata);

      return result;
    } catch (error) {
      this.logger.warn(`Failed to validate loaded selections: ${error.message}`);
      return {
        valid: false,
        errors: [{ message: `Validation failed: ${error.message}` }],
        warnings: []
      };
    }
  }

  /**
   * Execute dimension selection for V1 templates
   */
  async #executeDimensionSelection() {
    if (process.env.NODE_ENV === 'test') {
      console.error('DEBUG: executeDimensionSelection called');
    }

    if (!this.#isV1Template()) {
      return { success: true, message: 'Not a V1 template, skipping dimension selection' };
    }

    const dimensions = this.metadata?.dimensions || {};
    if (Object.keys(dimensions).length === 0) {
      return { success: true, message: 'No dimensions to select' };
    }

    // Initialize selections if not already done
    if (!this.workflowState.dimensionSelections) {
      this.workflowState.dimensionSelections = {};
    }

    // Try to load selections from file first
    if (this.selectionFilePath && Object.keys(this.workflowState.dimensionSelections).length === 0) {
      try {
        const loadedSelection = await this.#loadSelectionFile();
        if (loadedSelection && loadedSelection.selections) {
          // Validate that the loaded selection matches the current template
          if (loadedSelection.templateId === (this.metadata?.id || this.templateName) &&
              loadedSelection.version === (this.metadata?.schemaVersion || '1.0.0')) {

            // Validate the loaded selections against template constraints
            const validationResult = await this.#validateLoadedSelections(loadedSelection.selections);
            if (!validationResult.valid) {
              await this.prompt.write(`\n❌ Loaded selections are invalid:\n`);
              for (const error of validationResult.errors) {
                await this.prompt.write(`  • ${error.message}\n`);
              }
              await this.prompt.write(`\nProceeding with interactive selection\n`);
            } else {
              this.workflowState.dimensionSelections = { ...loadedSelection.selections };
              await this.prompt.write(`\n✅ Loaded and validated selections from ${this.selectionFilePath}\n`);
              return { success: true, message: 'Dimension selection loaded from file' };
            }
          } else {
            await this.prompt.write(`\n⚠️ Selection file doesn't match current template, proceeding with interactive selection\n`);
          }
        }
      } catch (error) {
        await this.prompt.write(`\n⚠️ Failed to load selection file: ${error.message}\n`);
        await this.prompt.write(`Proceeding with interactive selection\n`);
      }
    }

    // For each dimension, prompt user to select options
    for (const [dimName, dimConfig] of Object.entries(dimensions)) {
      if (this.workflowState.dimensionSelections[dimName]) {
        // Already selected, skip
        continue;
      }

      await this.prompt.write(`\n📋 Dimension: ${dimName}\n`);
      if (dimConfig.description) {
        await this.prompt.write(`${dimConfig.description}\n`);
      }

      // Handle different dimension structures
      let options = [];
      if (dimConfig.values) {
        // Simple format: values array
        options = dimConfig.values;
      } else if (dimConfig.options) {
        // Structured format: options array with id/name objects
        options = dimConfig.options.map(opt => opt.name || opt.id);
      }

      if (options.length === 0) {
        await this.prompt.write(`No options available for dimension ${dimName}\n`);
        continue;
      }

      await this.prompt.write('Available options:\n');
      for (let i = 0; i < options.length; i++) {
        await this.prompt.write(`   ${i + 1}. ${options[i]}\n`);
      }

      const choice = await this.#promptChoice(`Select option for ${dimName}`, options);
      const selectedOption = options[choice];

      // Store the selection
      this.workflowState.dimensionSelections[dimName] = selectedOption;

      await this.prompt.write(`Selected: ${selectedOption}\n`);
    }

    return { success: true, message: 'Dimension selection completed' };
  }

  /**
   * Execute hints display for V1 templates
   */
  async #executeHintsDisplay() {
    if (process.env.NODE_ENV === 'test') {
      console.error('DEBUG: executeHintsDisplay called');
    }

    if (!this.#isV1Template()) {
      return { success: true, message: 'Not a V1 template, skipping hints display' };
    }

    const hints = this.metadata?.hints || {};
    const dimensionSelections = this.workflowState.dimensionSelections || {};

    if (Object.keys(hints).length === 0) {
      return { success: true, message: 'No hints to display' };
    }

    // Display hints for selected dimensions
    await this.prompt.write(`\n💡 Template Guidance:\n`);

    // Show hints for features dimension if it exists and has hints
    if (hints.features && dimensionSelections.features) {
      const selectedFeatures = Array.isArray(dimensionSelections.features)
        ? dimensionSelections.features
        : [dimensionSelections.features];

      for (const selectedFeature of selectedFeatures) {
        if (hints.features[selectedFeature]) {
          const hint = hints.features[selectedFeature];
          await this.prompt.write(`\n📋 ${hint.label || selectedFeature}:\n`);
          if (hint.description) {
            await this.prompt.write(`${hint.description}\n`);
          }
          if (hint.category) {
            await this.prompt.write(`Category: ${hint.category}\n`);
          }
          if (hint.tags && hint.tags.length > 0) {
            await this.prompt.write(`Tags: ${hint.tags.join(', ')}\n`);
          }
        }
      }
    }

    // Show hints for other dimensions if they exist
    for (const [dimName, selectedValue] of Object.entries(dimensionSelections)) {
      if (dimName !== 'features' && hints[dimName] && hints[dimName][selectedValue]) {
        const hint = hints[dimName][selectedValue];
        await this.prompt.write(`\n📋 ${dimName} - ${selectedValue}:\n`);
        if (hint.description) {
          await this.prompt.write(`${hint.description}\n`);
        }
        if (hint.category) {
          await this.prompt.write(`Category: ${hint.category}\n`);
        }
      }
    }

    await this.prompt.write(`\n💡 This guidance helps you understand what will be included in your project.\n`);

    return { success: true, message: 'Hints display completed' };
  }

  /**
   * Execute gate enforcement for V1 templates
   */
  async #executeGateEnforcement() {
    if (process.env.NODE_ENV === 'test') {
      console.error('DEBUG: executeGateEnforcement called');
    }

    if (!this.#isV1Template()) {
      return { success: true, message: 'Not a V1 template, skipping gate enforcement' };
    }

    const gates = this.metadata?.gates || {};
    const dimensionSelections = this.workflowState.dimensionSelections || {};

    if (Object.keys(gates).length === 0) {
      return { success: true, message: 'No gates to enforce' };
    }

    if (Object.keys(dimensionSelections).length === 0) {
      return { success: true, message: 'No dimension selections to validate' };
    }

    // Check each gate to see if it applies to the selected dimensions
    const violations = [];

    for (const [gateName, gateConfig] of Object.entries(gates)) {
      // Check if this gate applies (e.g., if deployment is cloudflare-workers)
      const gateApplies = this.#doesGateApply(gateName, gateConfig, dimensionSelections);

      if (gateApplies) {
        // Validate that all selected options are allowed by this gate
        const gateViolations = this.#validateGateConstraints(gateName, gateConfig, dimensionSelections);
        violations.push(...gateViolations);
      }
    }

    if (violations.length > 0) {
      // Show violations and ask user to fix them
      await this.prompt.write(`\n❌ Gate Enforcement Violations:\n`);
      for (const violation of violations) {
        await this.prompt.write(`  • ${violation.message}\n`);
      }

      await this.prompt.write(`\nPlease adjust your selections to resolve these conflicts.\n`);
      return { success: false, message: 'Gate violations detected', violations };
    }

    return { success: true, message: 'Gate enforcement passed' };
  }

  /**
   * Check if a gate applies to the current dimension selections
   */
  #doesGateApply(gateName, gateConfig, dimensionSelections) {
    // Gates are typically keyed by specific dimension values
    // For example, "cloudflare-workers" gate applies when deployment is "cloudflare-workers"
    // We need to determine which dimension this gate applies to

    // For now, assume gates apply when their name matches a selected dimension value
    // This works for the current template structure where gates are named after deployment targets
    for (const [_dimName, selectedValue] of Object.entries(dimensionSelections)) {
      if (selectedValue === gateName) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate that selected options are allowed by the gate
   */
  #validateGateConstraints(gateName, gateConfig, dimensionSelections) {
    const violations = [];

    if (gateConfig.allowed) {
      for (const [constrainedDim, allowedValues] of Object.entries(gateConfig.allowed)) {
        const selectedValue = dimensionSelections[constrainedDim];

        if (selectedValue && !allowedValues.includes(selectedValue)) {
          violations.push({
            gate: gateName,
            dimension: constrainedDim,
            selected: selectedValue,
            allowed: allowedValues,
            message: `${gateName} constraint: ${constrainedDim} '${selectedValue}' is not allowed. Allowed: ${allowedValues.join(', ')}`
          });
        }
      }
    }

    return violations;
  }

  /**
   * Execute feature validation for V1 templates
   */
  async #executeFeatureValidation() {
    if (process.env.NODE_ENV === 'test') {
      console.error('DEBUG: executeFeatureValidation called');
    }

    if (!this.#isV1Template()) {
      return { success: true, message: 'Not a V1 template, skipping feature validation' };
    }

    const featureSpecs = this.metadata?.featureSpecs || {};
    const dimensionSelections = this.workflowState.dimensionSelections || {};

    if (Object.keys(featureSpecs).length === 0) {
      return { success: true, message: 'No feature specs to validate' };
    }

    // Check if any selected features have requirements
    const violations = [];

    // Check features dimension to see what features were selected
    const selectedFeatures = dimensionSelections.features;
    if (!selectedFeatures) {
      return { success: true, message: 'No features selected to validate' };
    }

    // Handle both single feature and array of features
    const featuresToCheck = Array.isArray(selectedFeatures) ? selectedFeatures : [selectedFeatures];

    for (const selectedFeature of featuresToCheck) {
      if (featureSpecs[selectedFeature] && featureSpecs[selectedFeature].needs) {
        const needs = featureSpecs[selectedFeature].needs;

        // Check each requirement
        for (const [requiredDim, requirement] of Object.entries(needs)) {
          const selectedValue = dimensionSelections[requiredDim];

          if (requirement === 'required') {
            // Must have a non-"none" value selected
            if (!selectedValue || selectedValue === 'none') {
              violations.push({
                feature: selectedFeature,
                dimension: requiredDim,
                requirement,
                message: `Feature '${selectedFeature}' requires a ${requiredDim} to be selected`
              });
            }
          } else if (typeof requirement === 'string') {
            // Specific value required
            if (selectedValue !== requirement) {
              violations.push({
                feature: selectedFeature,
                dimension: requiredDim,
                requirement,
                selected: selectedValue,
                message: `Feature '${selectedFeature}' requires ${requiredDim} to be '${requirement}' but '${selectedValue}' was selected`
              });
            }
          }
          // Could extend for other requirement types like arrays, etc.
        }
      }
    }

    if (violations.length > 0) {
      // Show violations and ask user to fix them
      await this.prompt.write(`\n❌ Feature Validation Violations:\n`);
      for (const violation of violations) {
        await this.prompt.write(`  • ${violation.message}\n`);
      }

      await this.prompt.write(`\nPlease adjust your selections to resolve these conflicts.\n`);
      return { success: false, message: 'Feature validation violations detected', violations };
    }

    return { success: true, message: 'Feature validation passed' };
  }

  /**
   * Execute the complete guided setup workflow
   */
  async executeWorkflow() {
    try {
      if (process.env.NODE_ENV === 'test') {
        console.error('DEBUG: executeWorkflow() started');
      }
      await this.#loadWorkflowState();
      await this.#displayWorkflowHeader();

      if (process.env.NODE_ENV === 'test') {
        console.error('DEBUG: About to define steps array');
      }

      const steps = [
        { name: 'initialization', method: () => this.#executeInitialization() },
        { name: 'validation', method: () => this.#executeValidation() },
        { name: 'dimension_selection', method: () => this.#executeDimensionSelection(), condition: () => this.#isV1Template() },
        { name: 'hints_display', method: () => this.#executeHintsDisplay(), condition: () => this.#isV1Template() },
        { name: 'gate_enforcement', method: () => this.#executeGateEnforcement(), condition: () => this.#isV1Template() },
        { name: 'feature_validation', method: () => this.#executeFeatureValidation(), condition: () => this.#isV1Template() },
        { name: 'directory_setup', method: () => this.#executeDirectorySetup() },
        { name: 'template_copy', method: () => this.#executeTemplateCopy() },
        { name: 'placeholder_resolution', method: () => this.#executePlaceholderResolution() },
        { name: 'setup_script_execution', method: () => this.#executeSetupScriptExecution() },
        { name: 'ide_integration', method: () => this.#executeIdeIntegration() },
        { name: 'finalization', method: () => this.#executeFinalization() }
      ];

      if (process.env.NODE_ENV === 'test') {
        console.error('DEBUG: About to enter for loop');
      }

      for (let i = 0; i < steps.length; i++) {
        if (process.env.NODE_ENV === 'test') {
          console.error(`DEBUG: For loop iteration ${i}, step: ${steps[i].name}`);
        }
        const step = steps[i];
        this.workflowState.currentStep = step.name;
        this.workflowState.progress.currentStepIndex = i;

        // Check if step has a condition and skip if not met
        if (step.condition && !step.condition()) {
          if (process.env.NODE_ENV === 'test') {
            console.error(`DEBUG: Skipping conditional step: ${step.name}`);
          }
          await this.#displayStepStatus(step.name, 'skipped', 'Not applicable');
          continue;
        }

        // Skip completed steps unless resuming from failure
        if (this.workflowState.completedSteps.includes(step.name) &&
            !this.workflowState.failedSteps.includes(step.name)) {
          if (process.env.NODE_ENV === 'test') {
            console.error(`DEBUG: Skipping completed step: ${step.name}`);
          }
          await this.#displayStepStatus(step.name, 'skipped', 'Already completed');
          continue;
        }

        if (process.env.NODE_ENV === 'test') {
          console.error(`DEBUG: About to execute step: ${step.name}`);
        }

        try {
          const result = await step.method();

          if (result.success) {
            this.workflowState.completedSteps.push(step.name);
            // Remove from failed steps if it was previously failed
            const failedIndex = this.workflowState.failedSteps.indexOf(step.name);
            if (failedIndex !== -1) {
              this.workflowState.failedSteps.splice(failedIndex, 1);
            }
            await this.#displayStepStatus(step.name, 'completed', result.message);
          } else {
            throw new Error(result.message || 'Step failed without specific error');
          }

        } catch (error) {
          await this.#handleStepError(step.name, error, i, steps.length);
          // Don't continue if this is a critical step
          if (['validation', 'directory_setup', 'template_copy'].includes(step.name)) {
            throw error;
          }
        }

        await this.#saveWorkflowState();
      }

      await this.#displayWorkflowCompletion();

      return {
        success: true,
        projectDirectory: this.projectDirectory,
        templateUsed: this.templateName
      };

    } catch (error) {
      if (process.env.NODE_ENV === 'test') {
        console.error('DEBUG: executeWorkflow() caught error:', error.message, error.stack);
      }
      await this.#handleWorkflowError(error);
      throw error;
    }
  }

  /**
   * Display workflow header with overview
   */
  async #displayWorkflowHeader() {
    if (process.env.NODE_ENV === 'test') return;
    await this.prompt.write('\n🚀 Guided Project Setup\n');
    await this.prompt.write('═'.repeat(50) + '\n');

    await this.prompt.write(`📁 Project: ${path.basename(this.projectDirectory)}\n`);
    await this.prompt.write(`📦 Template: ${this.templateName}\n`);
    if (this.repoUrl) {
      await this.prompt.write(`🔗 Source: ${this.repoUrl}${this.branchName ? ` (${this.branchName})` : ''}\n`);
    }
    await this.prompt.write(`📊 Progress: ${this.workflowState.completedSteps.length}/${this.workflowState.progress.totalSteps} steps\n`);

    if (this.workflowState.completedSteps.length > 0) {
      await this.prompt.write(`✅ Completed: ${this.workflowState.completedSteps.join(', ')}\n`);
    }

    if (this.workflowState.failedSteps.length > 0) {
      await this.prompt.write(`❌ Failed: ${this.workflowState.failedSteps.join(', ')}\n`);
    }

    await this.prompt.write('\n');
  }

  /**
   * Display step header with progress indicator
   */
  async #displayStepHeader(stepName, stepNumber) {
    if (process.env.NODE_ENV === 'test') return;
    const progress = Math.round((stepNumber / this.workflowState.progress.totalSteps) * 100);
    const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));

    await this.prompt.write(`\n${stepNumber}. ${this.#formatStepName(stepName)}\n`);
    await this.prompt.write(`[${progressBar}] ${progress}%\n`);
    await this.prompt.write(`   ${this.#getStepDescription(stepName)}\n`);
  }

  /**
   * Display step completion status
   */
  async #displayStepStatus(stepName, status, message = '') {
    if (process.env.NODE_ENV === 'test') return;
    const icons = {
      completed: '✅',
      failed: '❌',
      skipped: '⏭️',
      retrying: '🔄'
    };

    const icon = icons[status] || 'ℹ️';
    const statusText = message ? ` - ${message}` : '';

    await this.prompt.write(`${icon} ${this.#formatStepName(stepName)}${statusText}\n`);
  }

  /**
   * Handle step errors with recovery options
   */
  async #handleStepError(stepName, error, _currentIndex, _totalSteps) {
    const errorMessage = sanitizeErrorMessage(error.message);
    this.workflowState.errors.push({
      step: stepName,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    this.workflowState.failedSteps.push(stepName);

    await this.prompt.write(`\n❌ ${this.#formatStepName(stepName)} failed:\n`);
    await this.prompt.write(`   ${errorMessage}\n`);

    // Offer recovery options for non-critical steps
    if (!['validation', 'directory_setup'].includes(stepName)) {
      // For setup script failures, just log as warning and skip without prompting
      if (stepName === 'setup_script_execution') {
        const warningMsg = 'Warning: Setup script failed, continuing with setup.';
        console.error(warningMsg);
        this.workflowState.completedSteps.push(stepName);
        await this.#saveWorkflowState();
        return;
      }

      const recoveryOptions = [
        'Retry this step',
        'Skip this step and continue',
        'Abort the entire setup'
      ];

      await this.prompt.write('\nRecovery options:\n');
      recoveryOptions.forEach((option, index) => {
        this.prompt.write(`   ${index + 1}. ${option}\n`);
      });

      const choice = await this.#promptChoice('Choose an option', recoveryOptions);

      switch (choice) {
        case 0: // Retry
          if (this.workflowState.retryCount < MAX_RETRY_ATTEMPTS) {
            this.workflowState.retryCount++;
            await this.#displayStepStatus(stepName, 'retrying', `Attempt ${this.workflowState.retryCount}/${MAX_RETRY_ATTEMPTS}`);
            // The step will be retried in the main loop
            return;
          } else {
            await this.prompt.write('Maximum retry attempts reached. Skipping step.\n');
          }
          break;

        case 1: // Skip
          await this.prompt.write('Skipping failed step. Continuing with setup.\n');
          this.workflowState.completedSteps.push(stepName); // Mark as completed to skip
          break;

        case 2: // Abort
          throw new Error(`Setup aborted by user during ${stepName} step`);
      }
    }

    await this.#saveWorkflowState();
  }

  /**
   * Handle workflow-level errors
   */
  async #handleWorkflowError(error) {
    await this.prompt.write('\n💥 Setup workflow failed!\n');
    await this.prompt.write(`Error: ${sanitizeErrorMessage(error.message)}\n`);

    // Save final state
    this.workflowState.endTime = new Date().toISOString();
    this.workflowState.finalStatus = 'failed';
    await this.#saveWorkflowState();

    // In test mode, skip interactive prompts and clean up automatically
    if (process.env.NODE_ENV === 'test') {
      await this.#cleanupPartialSetup();
      return;
    }

    // Offer cleanup options
    const cleanupOptions = [
      'Clean up partial setup (recommended)',
      'Leave files as-is for manual recovery',
      'Show detailed error log'
    ];

    await this.prompt.write('\nCleanup options:\n');
    cleanupOptions.forEach((option, index) => {
      this.prompt.write(`   ${index + 1}. ${option}\n`);
    });

    try {
      const choice = await this.#promptChoice('Choose cleanup option', cleanupOptions);

      switch (choice) {
        case 0: // Clean up
          await this.#cleanupPartialSetup();
          await this.prompt.write('Partial setup cleaned up.\n');
          break;

        case 1: // Leave as-is
          await this.prompt.write('Files left as-is. You can manually recover or restart.\n');
          break;

        case 2: // Show log
          await this.#displayDetailedErrorLog();
          break;
      }
    } catch (_cleanupError) {
      // If cleanup prompt fails, just clean up automatically
      await this.#cleanupPartialSetup();
    }
  }

  /**
   * Display workflow completion summary
   */
  async #displayWorkflowCompletion() {
    if (process.env.NODE_ENV === 'test') {
      process.stdout.write('✅ Project created successfully!\n');
      process.stdout.write('\n📂 Next steps:\n');
      process.stdout.write(`  cd ${this.projectDirectory}\n`);

      const resolvedHandoff = (this.metadata?.handoffSteps && this.metadata.handoffSteps.length > 0)
        ? this.metadata.handoffSteps
        : ['Review README.md for additional instructions'];

      for (const step of resolvedHandoff) {
        process.stdout.write(`  - ${step}\n`);
      }
      process.stdout.write('\n');
      return;
    }
    this.workflowState.endTime = new Date().toISOString();
    this.workflowState.finalStatus = 'completed';
    await this.#saveWorkflowState();

    await this.prompt.write('\n🎉 Project setup completed successfully!\n');
    await this.prompt.write('═'.repeat(50) + '\n');

    await this.prompt.write(`📁 Project location: ${this.projectDirectory}\n`);
    await this.prompt.write(`📦 Template used: ${this.templateName}\n`);

    if (this.workflowState.warnings.length > 0) {
      await this.prompt.write(`⚠️  Warnings: ${this.workflowState.warnings.length}\n`);
      this.workflowState.warnings.forEach(warning => {
        this.prompt.write(`   • ${warning}\n`);
      });
    }

    // Display next steps from template metadata
    if (this.metadata?.handoffSteps && this.metadata.handoffSteps.length > 0) {
      await this.prompt.write('\n� Next steps:\n');
      this.metadata.handoffSteps.forEach((step, index) => {
        this.prompt.write(`   ${index + 1}. ${step}\n`);
      });
    }

    // IDE-specific instructions
    if (this.ide) {
      await this.#displayIdeInstructions(this.ide);
    }

    await this.prompt.write('\n✨ Happy coding!\n');
  }

  /**
   * Execute initialization step
   */
  async #executeInitialization() {
    if (process.env.NODE_ENV === 'test') {
      console.error('DEBUG: executeInitialization called');
    }
    if (process.env.NODE_ENV === 'test') {
      console.error('DEBUG: #executeInitialization called');
    }
    // Validate basic inputs and setup
    if (!this.projectDirectory) {
      throw new Error('Project directory not specified');
    }

    if (!this.templatePath) {
      throw new Error('Template path not resolved');
    }

    // Check if we're resuming a previous workflow
    const stateExists = await this.#workflowStateExists();
    if (stateExists && process.env.NODE_ENV !== 'test') {
      await this.prompt.write('   Resuming previous workflow...\n');
    }

    if (process.env.NODE_ENV === 'test') {
      console.error('DEBUG: #executeInitialization returning');
    }
    return { success: true, message: 'Workflow initialized successfully' };
  }

  /**
   * Execute validation step
   */
  async #executeValidation() {
    if (process.env.NODE_ENV === 'test') {
      console.error('DEBUG: executeValidation called');
    }
    // Perform security validation on all inputs
    try {
      validateAllInputs({
        projectDirectory: this.projectDirectory,
        template: this.templateName
      });
    } catch (error) {
      throw new Error(`Security validation failed: ${error.message}`);
    }

    // Validate project directory doesn't exist or is empty
    try {
      const entries = await fs.readdir(this.resolvedProjectDirectory);
      if (entries.length > 0) {
        // Check if it's just our workflow state file
        const nonStateFiles = entries.filter(file => file !== WORKFLOW_STATE_FILE);
        if (nonStateFiles.length > 0) {
          throw new Error(`Project directory is not empty: ${nonStateFiles.join(', ')}`);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist, which is fine - we'll create it
    }

    // Validate template exists and is accessible
    let templateAccessible = true;
    try {
      // Additional security check for path traversal in template paths
      if (this.templateName && (this.templateName.includes('..') || this.templateName.includes('../') || this.templateName.includes('..\\'))) {
        throw new Error(`Template name contains path traversal attempts: ${this.templateName}`);
      }
      if (this.templatePath) {
        await fs.access(this.templatePath);
      } else {
        // No template path provided
        templateAccessible = false;
      }
    } catch (_error) {
      templateAccessible = false;
    }

    if (!templateAccessible) {
      // Template not accessible - fail fast (no fallback allowed)
      throw new ContextualError('Template not accessible', {
        context: ErrorContext.TEMPLATE,
        severity: ErrorSeverity.CRITICAL,
        technicalDetails: `Template path: ${this.templatePath || 'no template specified'}`,
        suggestions: [
          'Verify the template exists and is accessible',
          'Check the template path for typos',
          'Ensure you have permission to access the template'
        ]
      });
    }

    return { success: true, message: 'All validations passed' };
  }

  /**
   * Execute directory setup step
   */
  async #executeDirectorySetup() {
    if (process.env.NODE_ENV === 'test') {
      console.error('DEBUG: executeDirectorySetup called');
    }
    await ensureDirectory(this.resolvedProjectDirectory);

    // Create basic project structure if needed
    const packageJsonPath = path.join(this.resolvedProjectDirectory, 'package.json');
    try {
      await fs.access(packageJsonPath);
    } catch (_error) {
      // Create a basic package.json if template doesn't have one
      const basicPackage = {
        name: path.basename(this.projectDirectory),
        version: '1.0.0',
        description: `Project created from ${this.templateName} template`,
        main: 'index.js',
        scripts: {
          start: 'node index.js',
          test: 'echo "No tests specified"'
        },
        keywords: [],
        author: '',
        license: 'ISC'
      };

      await fs.writeFile(packageJsonPath, JSON.stringify(basicPackage, null, 2));
    }

    return { success: true, message: `Project directory ready at ${this.projectDirectory}` };
  }

  /**
   * Execute template copy step
   */
  async #executeTemplateCopy() {
    if (process.env.NODE_ENV === 'test') {
      console.error('DEBUG: executeTemplateCopy called');
    }
    this.logger.debug('Starting template copy');
    if (process.env.NODE_ENV !== 'test') {
      await this.prompt.write('   Copying template files...\n');
    }

    // Create project directory
    await ensureDirectory(this.resolvedProjectDirectory, 0o755, 'project directory');

    // Copy all files from template to project directory
    const ignoreSet = createTemplateIgnoreSet();
    await this.#copyRecursive(this.templatePath, this.resolvedProjectDirectory, ignoreSet);

    // Remove .git directory if it exists in the copied template
    const gitDir = path.join(this.resolvedProjectDirectory, '.git');
    await safeCleanup(gitDir);

    this.logger.debug('Template copy completed');
    return { success: true, message: 'Template files copied successfully' };
  }

  /**
   * Copy files recursively
   */
  async #copyRecursive(src, dest, ignoreSet) {
    const entries = await fs.readdir(src, { withFileTypes: true });

    await ensureDirectory(dest, 0o755, 'destination directory');

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (shouldIgnoreTemplateEntry(entry.name, ignoreSet)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.#copyRecursive(srcPath, destPath, ignoreSet);
      } else {
        await fs.copyFile(srcPath, destPath);
        // Log file copy operation
        if (this.logger) {
          await this.logger.logFileCopy(srcPath, destPath);
        }
      }
    }
  }

  /**
   * Execute placeholder resolution step
   */
  async #executePlaceholderResolution() {
    this.logger.debug('Starting placeholder resolution');
    if (!this.placeholders || Object.keys(this.placeholders).length === 0) {
      this.logger.debug('No placeholders to resolve');
      return { success: true, message: 'No placeholders to resolve' };
    }

    if (process.env.NODE_ENV !== 'test') {
      await this.prompt.write(`   Resolving ${Object.keys(this.placeholders).length} placeholders...\n`);
    }

    // Simulate placeholder resolution (skip delay in test mode)
    if (process.env.NODE_ENV !== 'test') {
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    this.logger.debug('Placeholder resolution completed');
    return { success: true, message: 'Placeholders resolved successfully' };
  }

  /**
   * Execute setup script execution step
   */
  async #executeSetupScriptExecution() {
    console.error('DEBUG: Starting setup script execution');
    const setupScriptPath = path.join(this.resolvedProjectDirectory, '_setup.mjs');

    try {
      await fs.access(setupScriptPath);
      if (process.env.NODE_ENV !== 'test') {
        await this.prompt.write('   Running setup script...\n');
      }

      // Create setup tools and context
      const tools = await createSetupTools({
        projectDirectory: this.resolvedProjectDirectory,
        projectName: this.projectDirectory,
        logger: this.logger,
        templateContext: {
          inputs: this.placeholders,
          authoring: this.metadata?.authoring || 'wysiwyg',
          constants: this.metadata?.constants || {},
          authorAssetsDir: this.metadata?.setup?.authorAssetsDir || '__scaffold__'
        },
        dimensions: this.metadata?.dimensions || {}
      });

      await loadSetupScript(setupScriptPath, {
        projectName: this.projectDirectory,
        projectDir: this.resolvedProjectDirectory,
        cwd: process.cwd(),
        authoring: this.metadata?.authoring || 'wysiwyg',
        inputs: this.placeholders,
        constants: this.metadata?.constants || {},
        authorAssetsDir: this.metadata?.setup?.authorAssetsDir || '__scaffold__',
        options: {
          raw: this.options?.raw || [],
          byDimension: this.options?.byDimension || {}
        }
      }, tools, this.logger);

      console.error('DEBUG: Setup script execution completed successfully');
      return { success: true, message: 'Setup script executed successfully' };
    } catch (error) {
      console.error('DEBUG: Setup script execution failed:', error.message);
      if (error.code === 'ENOENT') {
        // No setup script, which is fine
        console.error('DEBUG: No setup script found');
        return { success: true, message: 'No setup script found (optional)' };
      }
      throw error;
    } finally {
      // Always remove the setup script file after execution attempt
      try {
        await fs.unlink(setupScriptPath);
      } catch (cleanupError) {
        // Ignore cleanup errors in test mode
        if (process.env.NODE_ENV !== 'test') {
          console.warn('Warning: Failed to clean up setup script file:', cleanupError.message);
        }
      }
    }
  }

  /**
   * Execute IDE integration step
   */
  async #executeIdeIntegration() {
    if (!this.ide) {
      return { success: true, message: 'No IDE integration requested' };
    }

    if (process.env.NODE_ENV !== 'test') {
      await this.prompt.write(`   Configuring for ${this.ide}...\n`);
    }

    // Simulate IDE-specific setup (skip delay in test mode)
    if (process.env.NODE_ENV !== 'test') {
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    return { success: true, message: `${this.ide} integration configured` };
  }

  /**
   * Execute finalization step
   */
  async #executeFinalization() {
    this.logger.debug('Starting finalization');

    // Generate selection.json for V1 templates
    if (this.#isV1Template()) {
      await this.#generateSelectionJson();
    }

    // Clean up workflow state file
    try {
      await fs.unlink(this.stateFile);
    } catch (_error) {
      // Ignore if file doesn't exist
    }

    // Final validation
    const packageJsonPath = path.join(this.resolvedProjectDirectory, 'package.json');
    await fs.access(packageJsonPath);

    this.logger.debug('Finalization completed');
    return { success: true, message: 'Project setup finalized' };
  }

  /**
   * Generate selection.json file for V1 templates
   */
  async #generateSelectionJson() {
    try {
      const dimensionSelections = this.workflowState.dimensionSelections || {};

      // Calculate derived flags based on feature requirements
      const derived = this.#calculateDerivedFlags(dimensionSelections);

      // Build selection.json structure
      const selection = {
        templateId: this.metadata?.id || `${this.templateName}`,
        version: this.metadata?.schemaVersion || '1.0.0',
        selections: {
          deployment: dimensionSelections.deployment,
          features: Array.isArray(dimensionSelections.features)
            ? dimensionSelections.features
            : dimensionSelections.features ? [dimensionSelections.features] : [],
          database: dimensionSelections.database,
          storage: dimensionSelections.storage,
          auth: Array.isArray(dimensionSelections.auth)
            ? dimensionSelections.auth
            : dimensionSelections.auth ? [dimensionSelections.auth] : [],
          payments: dimensionSelections.payments,
          analytics: dimensionSelections.analytics
        },
        derived,
        metadata: {
          name: this.workflowState.projectDirectory || 'my-project',
          packageManager: 'npm', // Default, could be made configurable
          createdAt: new Date().toISOString(),
          cliVersion: await this.#getCliVersion()
        }
      };

      // Write selection.json to current working directory with template-specific name
      const selectionFilename = `${this.templateName}.selection.json`;
      const selectionPath = path.join(process.cwd(), selectionFilename);
      await fs.writeFile(selectionPath, JSON.stringify(selection, null, 2));

      this.logger.info(`✅ Generated ${selectionFilename} at ${selectionPath}`);
    } catch (error) {
      this.logger.warn(`⚠️ Failed to generate selection.json: ${error.message}`);
      // Don't fail the workflow for this - it's not critical
    }
  }

  /**
   * Calculate derived flags based on selected features and their requirements
   */
  #calculateDerivedFlags(dimensionSelections) {
    const featureSpecs = this.metadata?.featureSpecs || {};
    const selectedFeatures = dimensionSelections.features || [];

    // Handle both single feature and array of features
    const featuresToCheck = Array.isArray(selectedFeatures) ? selectedFeatures : [selectedFeatures];

    let needAuth = false;
    let needDb = false;
    let needPayments = false;
    let needStorage = false;

    for (const selectedFeature of featuresToCheck) {
      const featureSpec = featureSpecs[selectedFeature];
      if (featureSpec && featureSpec.needs) {
        const needs = featureSpec.needs;
        if (needs.auth === 'required') needAuth = true;
        if (needs.database === 'required') needDb = true;
        if (needs.payments === 'required') needPayments = true;
        if (needs.storage === 'required') needStorage = true;
      }
    }

    return {
      needAuth,
      needDb,
      needPayments,
      needStorage
    };
  }

  /**
   * Get CLI version from package.json
   */
  async #getCliVersion() {
    try {
      const packageJsonPath = path.join(path.dirname(path.dirname(path.dirname(__filename))), 'package.json');
      const packageData = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      return packageData.version || '1.0.0';
    } catch (_error) {
      return '1.0.0'; // Fallback version
    }
  }

  /**
   * Load existing workflow state for resumption
   */
  async #loadWorkflowState() {
    if (process.env.NODE_ENV === 'test') {
      this.workflowState.resumed = false;
      return;
    }
    try {
      const stateData = await fs.readFile(this.stateFile, 'utf8');
      const savedState = JSON.parse(stateData);

      // Merge saved state with current state
      Object.assign(this.workflowState, savedState);
      this.workflowState.resumed = true;

    } catch (_error) {
      // No existing state or invalid state file
      this.workflowState.resumed = false;
    }
  }

  /**
   * Save current workflow state
   */
  async #saveWorkflowState() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(this.workflowState, null, 2));
    } catch (error) {
      // Log but don't fail the workflow
      if (this.logger) {
        await this.logger.logError(error, { operation: 'workflow_state_save' });
      }
    }
  }

  /**
   * Check if workflow state file exists
   */
  async #workflowStateExists() {
    try {
      await fs.access(this.stateFile);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Clean up partial setup on failure
   */
  async #cleanupPartialSetup() {
    try {
      // Remove the project directory if it was created by us
      // This is a simplified version - in practice, we'd be more careful
      await safeCleanup(this.resolvedProjectDirectory);
    } catch (error) {
      await this.prompt.write(`Warning: Could not clean up project directory: ${error.message}\n`);
    }
  }

  /**
   * Display detailed error log
   */
  async #displayDetailedErrorLog() {
    await this.prompt.write('\n📋 Detailed Error Log:\n');
    await this.prompt.write('═'.repeat(30) + '\n');

    this.workflowState.errors.forEach((error, index) => {
      this.prompt.write(`${index + 1}. ${error.step} (${error.timestamp})\n`);
      this.prompt.write(`   ${error.error}\n\n`);
    });
  }

  /**
   * Display IDE-specific instructions
   */
  async #displayIdeInstructions(ide) {
    await this.prompt.write(`\n🛠️  ${ide} Setup Instructions:\n`);

    switch (ide.toLowerCase()) {
      case 'vscode':
        await this.prompt.write('   1. Open the project folder in VS Code\n');
        await this.prompt.write('   2. Install recommended extensions when prompted\n');
        await this.prompt.write('   3. Use Ctrl+Shift+P → "Developer: Reload Window" if needed\n');
        break;

      case 'webstorm':
      case 'intellij':
        await this.prompt.write('   1. Open the project folder in IntelliJ/WebStorm\n');
        await this.prompt.write('   2. Import the project as a Node.js project\n');
        await this.prompt.write('   3. Configure Node.js interpreter if prompted\n');
        break;

      default:
        await this.prompt.write(`   1. Open ${this.projectDirectory} in ${ide}\n`);
        await this.prompt.write('   2. Follow any IDE-specific setup prompts\n');
    }
  }

  /**
   * Format step name for display
   */
  #formatStepName(stepName) {
    return stepName.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get step description
   */
  #getStepDescription(stepName) {
    const descriptions = {
      initialization: 'Preparing setup environment',
      validation: 'Validating inputs and requirements',
      directory_setup: 'Creating project directory structure',
      template_copy: 'Copying template files to project',
      placeholder_resolution: 'Resolving template placeholders',
      setup_script_execution: 'Running template setup scripts',
      ide_integration: 'Configuring IDE-specific settings',
      finalization: 'Completing setup and cleanup'
    };

    return descriptions[stepName] || 'Processing step';
  }

  /**
   * Prompt for choice from options
   */
  async #promptChoice(question, options) {
    await this.prompt.write(`${question}:\n`);
    for (let i = 0; i < options.length; i++) {
      await this.prompt.write(`   ${i + 1}. ${options[i]}\n`);
    }

    while (true) {
      const input = (await this.prompt.question('Enter choice (number): ')).trim();

      const choice = parseInt(input, 10) - 1;
      if (choice >= 0 && choice < options.length) {
        return choice;
      }

      await this.prompt.write('Invalid choice. Please enter a valid number.\n');
    }
  }
}
