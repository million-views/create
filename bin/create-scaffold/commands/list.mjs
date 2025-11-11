#!/usr/bin/env node

import { loadConfig } from '../config-loader.mjs';
import { TERMINOLOGY } from '../../../../create/lib/shared/ontology.mjs';
import {
  handleError,
  contextualizeError,
  ErrorContext
} from '../../../../create/lib/shared/utils/error-handler.mjs';

/**
 * Execute the 'list' command - list available templates
 */
export async function executeListCommand(args) {
  try {
    // Load configuration
    let configMetadata = null;
    try {
      const configResult = await loadConfig({
        cwd: process.cwd(),
        env: process.env,
        skip: Boolean(args[TERMINOLOGY.OPTION.NO_CONFIG])
      });

      if (configResult) {
        configMetadata = {
          path: configResult.path,
          providedKeys: [],
          appliedKeys: [],
          author: configResult.defaults?.author ?? null,
          placeholders: Array.isArray(configResult.defaults?.placeholders)
            ? configResult.defaults.placeholders
            : [],
          defaults: configResult.defaults
        };
      }
    } catch (error) {
      // For list command, configuration errors are fatal (for backward compatibility with tests)
      console.error(`❌ Configuration error: ${error.message}`);
      return 1;
    }

    const registryName = args[TERMINOLOGY.OPTION.REGISTRY];
    const jsonOutput = Boolean(args[TERMINOLOGY.OPTION.JSON]);
    const registries = configMetadata?.defaults?.registries || {};

    if (registryName) {
      // List templates from a specific registry
      const registry = registries[registryName];

      if (!registry) {
        console.error(`❌ Registry "${registryName}" not found in configuration.`);
        console.error('');
        console.error('Available registries:');
        const availableRegistries = Object.keys(registries);
        if (availableRegistries.length === 0) {
          console.error('  (none configured)');
        } else {
          for (const name of availableRegistries) {
            console.error(`  • ${name}`);
          }
        }
        return 1;
      }

      const templates = Object.entries(registry).map(([name, url]) => ({
        name,
        url,
        registry: registryName
      }));

      if (jsonOutput) {
        console.log(JSON.stringify(templates, null, 2));
      } else {
        console.log(`📋 Templates in registry "${registryName}":`);
        console.log('');

        if (templates.length === 0) {
          console.log('No templates found in this registry.');
        } else {
          for (const template of templates) {
            console.log(`• ${template.name}`);
            console.log(`  URL: ${template.url}`);
            console.log('');
          }
        }
      }
    } else {
      // List all available registries
      const registryNames = Object.keys(registries);

      if (jsonOutput) {
        const registryList = registryNames.map(name => ({
          name,
          description: `User-defined registry: ${name}`,
          templates: Object.keys(registries[name]).length
        }));
        console.log(JSON.stringify(registryList, null, 2));
      } else {
        console.log('📋 Available template registries:');
        console.log('');

        if (registryNames.length === 0) {
          console.log('No registries configured.');
          console.log('');
          console.log('To add templates to a registry, add them to your .m5nvrc file:');
          console.log('');
          console.log('```json');
          console.log('{');
          console.log('  "registries": {');
          console.log('    "myregistry": {');
          console.log('      "template1": "https://github.com/user/repo/template1",');
          console.log('      "template2": "https://github.com/user/repo/template2"');
          console.log('    }');
          console.log('  }');
          console.log('}');
          console.log('```');
        } else {
          for (const name of registryNames) {
            const templateCount = Object.keys(registries[name]).length;
            console.log(`• ${name}`);
            console.log(`  User-defined registry (${templateCount} templates)`);
            console.log('');
          }
        }
      }
    }

    return 0;
  } catch (error) {
    return handleError(error, 'list command execution failed');
  }
}