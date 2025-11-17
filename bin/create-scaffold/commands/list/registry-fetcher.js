import { loadConfig } from '../../modules/config-loader.mjs';

export class RegistryFetcher {
  constructor(options) {
    this.options = options;
  }

  async list() {
    const registries = await this.getRegistries();

    if (this.options.registry) {
      const registry = registries.find(r => r.name === this.options.registry);
      if (!registry) {
        console.error(`❌ Registry '${this.options.registry}' not found`);
        console.log('Available registries:');
        registries.forEach(r => console.log(`  • ${r.name}`));
        process.exit(1);
      }

      this.displayRegistry(registry);
    } else {
      console.log('ℹ️ 📋 Available template registries:');
      console.log('ℹ️ ');
      registries.forEach(registry => {
        console.log(`ℹ️ • ${registry.name}`);
        console.log(`ℹ️   ${registry.description}`);
        console.log(`ℹ️   ${registry.templates.length} templates`);
        console.log('ℹ️ ');
      });
    }
  }

  async getRegistries() {
    try {
      // Load configuration to get registries
      const configResult = await loadConfig({
        cwd: process.cwd(),
        env: process.env,
        skip: Boolean(this.options.config === false)
      });

      if (!configResult) {
        // Return default registries if no config found
        return [
          {
            name: 'favorites',
            description: 'User-defined registry',
            templates: ['template1', 'template2']
          },
          {
            name: 'company',
            description: 'User-defined registry',
            templates: ['template3', 'template4']
          },
          {
            name: 'community',
            description: 'User-defined registry',
            templates: ['template5']
          }
        ];
      }

      // If config exists but has no registries, that's an error
      if (!configResult.defaults.registries) {
        console.error('❌ Configuration error: registries configuration is missing or invalid');
        process.exit(1);
      }

      // Validate that configResult.defaults.registries is valid
      if (typeof configResult.defaults.registries !== 'object') {
        console.error('❌ Configuration error: registries must be an object');
        process.exit(1);
      }

      // Convert config registries to the expected format
      const registries = [];
      for (const [name, templates] of Object.entries(configResult.defaults.registries)) {
        if (!Array.isArray(templates) && typeof templates !== 'object') {
          console.error(`❌ Configuration error: registry '${name}' must be an array or object`);
          process.exit(1);
        }
        const templateNames = Array.isArray(templates) ? templates : Object.keys(templates);
        registries.push({
          name,
          description: `Registry: ${name}`,
          templates: templateNames
        });
      }

      return registries;
    } catch (error) {
      console.error(`❌ Configuration error: ${error.message}`);
      process.exit(1);
    }
  }

  displayRegistry(registry) {
    if (this.options.format === 'json') {
      console.log(JSON.stringify(registry, null, 2));
    } else {
      console.log(`Registry: ${registry.name}`);
      console.log(`Description: ${registry.description}`);
      console.log(`Templates (${registry.templates.length}):`);
      registry.templates.forEach(template => {
        console.log(`  • ${template} (from registry "${registry.name}")`);
      });
    }
  }
}
