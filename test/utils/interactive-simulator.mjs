#!/usr/bin/env node

/**
 * Interactive Simulator for Automated CLI Testing
 * Simulates user input for readline-based interactive sessions
 * Enables fully automated testing without human intervention
 */

export class InteractiveSimulator {
  constructor(responses = [], options = {}) {
    this.responses = Array.isArray(responses) ? [...responses] : [];
    this.callLog = [];
    this.outputLog = [];
    this.options = {
      debug: options.debug || false,
      timeout: options.timeout || 5000,
      ...options
    };
    this.closed = false;
  }

  /**
   * Simulate readline.question() - returns next queued response
   * @param {string} prompt - The prompt shown to user
   * @returns {Promise<string>} - The simulated user response
   */
  async question(prompt) {
    if (this.closed) {
      throw new Error('InteractiveSimulator is closed');
    }

    if (this.responses.length === 0) {
      throw new Error(`No more responses available for prompt: ${prompt}`);
    }

    const response = this.responses.shift();
    this.callLog.push({
      type: 'question',
      prompt: prompt.trim(),
      response,
      timestamp: Date.now()
    });

    if (this.options.debug) {
      console.log(`[SIMULATOR] Prompt: "${prompt.trim()}" -> Response: "${response}"`);
    }

    // Simulate realistic typing delay
    if (this.options.typingDelay) {
      await new Promise(resolve => setTimeout(resolve, this.options.typingDelay));
    }

    return response;
  }

  /**
   * Simulate readline.write() - captures output for verification
   * @param {string} message - Message written to stdout
   */
  write(message) {
    if (this.closed) {
      return;
    }

    this.outputLog.push({
      type: 'write',
      message,
      timestamp: Date.now()
    });

    if (this.options.debug) {
      console.log(`[SIMULATOR] Output: ${message.trim()}`);
    }
  }

  /**
   * Add more responses to the queue (for dynamic testing)
   * @param {string|string[]} responses - Additional responses to queue
   */
  queueResponses(responses) {
    const newResponses = Array.isArray(responses) ? responses : [responses];
    this.responses.push(...newResponses);
  }

  /**
   * Get remaining responses count
   * @returns {number} - Number of responses still queued
   */
  remainingResponses() {
    return this.responses.length;
  }

  /**
   * Close the simulator and prevent further operations
   */
  close() {
    this.closed = true;
  }

  /**
   * Get test results for verification
   * @returns {object} - Complete interaction log
   */
  getResults() {
    return {
      callLog: [...this.callLog],
      outputLog: [...this.outputLog],
      remainingResponses: this.responses.length,
      closed: this.closed
    };
  }

  /**
   * Assert that all expected interactions occurred
   * @param {object} expectations - Expected interaction patterns
   */
  assertInteractions(expectations = {}) {
    const results = this.getResults();
    const errors = [];

    if (expectations.minQuestions && results.callLog.length < expectations.minQuestions) {
      errors.push(`Expected at least ${expectations.minQuestions} questions, got ${results.callLog.length}`);
    }

    if (expectations.maxQuestions && results.callLog.length > expectations.maxQuestions) {
      errors.push(`Expected at most ${expectations.maxQuestions} questions, got ${results.callLog.length}`);
    }

    if (expectations.expectedPrompts) {
      for (const expectedPrompt of expectations.expectedPrompts) {
        const found = results.callLog.some(call =>
          call.type === 'question' && call.prompt.includes(expectedPrompt)
        );
        if (!found) {
          errors.push(`Expected prompt containing "${expectedPrompt}" not found`);
        }
      }
    }

    if (expectations.expectedOutputs) {
      for (const expectedOutput of expectations.expectedOutputs) {
        const found = results.outputLog.some(output =>
          output.message.includes(expectedOutput)
        );
        if (!found) {
          errors.push(`Expected output containing "${expectedOutput}" not found`);
        }
      }
    }

    if (results.remainingResponses > 0) {
      errors.push(`${results.remainingResponses} responses were not consumed`);
    }

    if (errors.length > 0) {
      throw new Error(`Interactive simulation assertions failed:\n${errors.join('\n')}`);
    }

    return true;
  }
}

/**
 * Create a pre-configured simulator for common test scenarios
 */
export class InteractiveTestPresets {
  static basicTemplateSelection(templateName = 'express-api', projectName = 'my-app') {
    return new InteractiveSimulator([
      templateName,    // Template selection
      projectName      // Project directory
    ]);
  }

  static templateWithOptions(templateName = 'express-api', projectName = 'my-app', ide = 'vscode', options = 'typescript') {
    return new InteractiveSimulator([
      templateName,    // Template selection
      projectName,     // Project directory
      ide,            // IDE selection
      options         // Options
    ]);
  }

  static errorRecovery(invalidInput, validInput) {
    return new InteractiveSimulator([
      invalidInput,   // Invalid input (will cause error)
      validInput      // Valid recovery input
    ]);
  }

  static cancellation() {
    return new InteractiveSimulator([
      'q'  // Quit command
    ]);
  }
}