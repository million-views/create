import fs from 'fs';
import path from 'path';

export class TemplateValidator {
  constructor(options) {
    this.options = options;
  }

  validate() {
    const templatePath = this.options.templatePath;

    try {
      const stats = fs.statSync(templatePath);

      if (stats.isDirectory()) {
        return this.validateDirectory(templatePath);
      } else if (stats.isFile() && path.basename(templatePath) === 'template.json') {
        return this.validateFile(templatePath);
      } else {
        console.error(`❌ Invalid template path: ${templatePath}`);
        console.error('Expected a directory or template.json file');
        return { valid: false };
      }
    } catch (error) {
      console.error(`❌ Cannot access template path: ${templatePath}`);
      console.error(error.message);
      return { valid: false };
    }
  }

  validateDirectory(dirPath) {
    const templateJsonPath = path.join(dirPath, 'template.json');
    const readmePath = path.join(dirPath, 'README.md');

    if (!fs.existsSync(templateJsonPath)) {
      console.error(`❌ template.json not found in ${dirPath}`);
      return { valid: false };
    }

    // Check for README.md
    if (!fs.existsSync(readmePath)) {
      const errors = ['Missing required file: README.md'];
      if (this.options.json) {
        console.log(JSON.stringify({
          status: 'fail',
          results: errors.map(error => ({ type: 'error', message: error }))
        }, null, 2));
      } else {
        console.error('❌ Validation failed:');
        errors.forEach(error => console.error(`  • ${error}`));
      }
      return { valid: false, errors };
    }

    return this.validateFile(templateJsonPath);
  }

  validateFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const template = JSON.parse(content);

      const errors = [];
      const _warnings = [];

      // Check required fields
      if (!template.name) {
        errors.push('Missing required field: name');
      }

      if (!template.description) {
        errors.push('Missing required field: description');
      }

      if (!template.version) {
        errors.push('Missing required field: version');
      }

      // Check placeholders structure
      if (template.placeholders && !Array.isArray(template.placeholders)) {
        errors.push('placeholders must be an array');
      }

      // Check files structure
      if (template.files) {
        if (template.files.include && !Array.isArray(template.files.include)) {
          errors.push('files.include must be an array');
        }
        if (template.files.exclude && !Array.isArray(template.files.exclude)) {
          errors.push('files.exclude must be an array');
        }
      }

      if (errors.length > 0) {
        if (this.options.json) {
          console.log(JSON.stringify({
            status: 'fail',
            results: errors.map(error => ({ type: 'error', message: error }))
          }, null, 2));
        } else {
          console.error('❌ Validation failed:');
          errors.forEach(error => console.error(`  • ${error}`));

          if (this.options.suggest) {
            console.log('\n💡 Suggestions:');
            // TODO: Add suggestions
          }
        }

        return { valid: false, errors };
      }

      if (this.options.json) {
        console.log(JSON.stringify({
          status: 'pass',
          results: []
        }, null, 2));
      } else {
        console.log('✓ Template validation successful');
        console.log('Summary: All checks passed');
      }
      return { valid: true };

    } catch (error) {
      console.error(`❌ Failed to parse template.json: ${error.message}`);
      return { valid: false };
    }
  }
}
