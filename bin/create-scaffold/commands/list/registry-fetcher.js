import { CacheManager } from '../../modules/cache-manager.mjs';
import { TemplateDiscovery } from '@m5nv/create-scaffold/lib/template/index.mts';
import { loadConfig } from '../../modules/config-loader.mjs';

export class RegistryFetcher {
  constructor(options) {
    this.options = options;
    this.cacheManager = new CacheManager();
    this.templateDiscovery = new TemplateDiscovery(this.cacheManager);
    this.defaultRegistry = 'git@github.com:million-views/templates.git';
  }

  async list() {
    try {
      const registryUrl = await this.resolveRegistryUrl(this.options.registry);

      console.log(`ℹ️ 📋 Listing templates from registry: ${registryUrl}`);
      console.log('ℹ️ ');

      const templates = await this.templateDiscovery.listTemplates(registryUrl);

      if (templates.length === 0) {
        console.log('ℹ️ No templates found in this registry.');
        console.log('ℹ️ 💡 Templates are identified by containing: package.json, template.json, _setup.mjs, src/, lib/, etc.');
        return;
      }

      if (this.options.format === 'json') {
        console.log(JSON.stringify({
          registry: registryUrl,
          templates
        }, null, 2));
      } else {
        console.log(`� Templates (${templates.length}):`);
        console.log('');

        templates.forEach((template, index) => {
          console.log(`  ${index + 1}. ${template.name || 'Unnamed Template'}`);
          if (template.description && template.description !== 'No description available') {
            console.log(`     ${template.description}`);
          }
          if (this.options.verbose && template.version) {
            console.log(`     Version: ${template.version}`);
          }
          if (this.options.verbose && template.author) {
            console.log(`     Author: ${template.author}`);
          }
          if (this.options.verbose && template.tags && template.tags.length > 0) {
            console.log(`     Tags: ${template.tags.join(', ')}`);
          }
          console.log('');
        });
      }
    } catch (error) {
      console.error(`❌ Failed to list templates: ${error.message}`);
      if (this.options.verbose) {
        console.error(`❌ Error details: ${error.stack}`);
      }
      process.exit(1);
    }
  }

  async resolveRegistryUrl(registryArg) {
    // If no registry specified, use default
    if (!registryArg) {
      return this.defaultRegistry;
    }

    // If it looks like a URL, treat it as a direct repository URL
    if (this.isRepositoryUrl(registryArg)) {
      return registryArg;
    }

    // Otherwise, treat it as a registry name and look it up in config
    const configResult = await loadConfig({
      cwd: process.cwd(),
      env: process.env,
      skip: Boolean(this.options.config === false)
    });

    if (!configResult || !configResult.defaults.registries) {
      throw new Error(`Registry '${registryArg}' not found in configuration. Available registries: none configured`);
    }

    const registries = configResult.defaults.registries;
    if (!registries[registryArg]) {
      const available = Object.keys(registries).join(', ');
      throw new Error(`Registry '${registryArg}' not found in configuration. Available registries: ${available}`);
    }

    const registry = registries[registryArg];
    if (typeof registry === 'string') {
      // Legacy string URL format
      return registry;
    } else if (typeof registry === 'object' && registry.type) {
      // Typed registry format
      if (registry.type === 'git') {
        return registry.url;
      } else if (registry.type === 'local') {
        return registry.path;
      } else {
        throw new Error(`Registry '${registryArg}' has unsupported type '${registry.type}'. Supported types: git, local`);
      }
    } else {
      throw new Error(`Registry '${registryArg}' is configured as a template mapping (for 'new' command), not a repository. Use 'create-scaffold new ${registryArg}/template-name' instead of 'list --registry ${registryArg}'`);
    }
  }

  isRepositoryUrl(str) {
    // Check if it looks like a repository URL
    return str.includes('://') ||
           str.includes('@') && str.includes(':') || // SSH format like git@github.com:user/repo.git
           str.includes('/') && !str.includes(' ') && str.split('/').length >= 2; // user/repo format
  }


}
