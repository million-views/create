import { TemplateValidator } from './lib/validation/template-validator.mjs';
import fs from 'fs';

const validator = new TemplateValidator();
const template = JSON.parse(fs.readFileSync('./registry/official/express-api/template.json', 'utf8'));

validator.validate(template).then(result => {
  console.log('Validation result:', result.valid ? 'VALID' : 'INVALID');
  if (!result.valid) {
    console.log('Errors:', result.errors);
  }
}).catch(err => console.error('Error:', err));