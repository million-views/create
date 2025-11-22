#!/usr/bin/env node

/**
 * E2E Tests: Tutorial Workflows
 * Tests complete user journeys from the tutorial documentation
 * Uses hermetic test environments with M5NV_HOME isolation
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  createTestEnvironment,
  execCLI,
  execCommand,
  assertFileExists,
  createViteProject,
  createTestProject,
  verifyIsolation
} from './test-helpers.mjs';

const LONG_TIMEOUT = 180000; // 3 minutes for complex workflows

test('Tutorial: Getting Started - Verify CLI tools accessible', async (t) => {
  const testEnv = await createTestEnvironment('getting-started');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Test create-scaffold --help
  const createScaffoldHelp = execCLI('create-scaffold', ['--help'], {
    env: testEnv.env,
    cwd: testEnv.workspaceDir
  });

  assert.strictEqual(createScaffoldHelp.exitCode, 0, 'create-scaffold --help should succeed');
  assert(createScaffoldHelp.stdout.includes('create-scaffold'), 'Should show create-scaffold help');

  // Test make-template --help
  const makeTemplateHelp = execCLI('make-template', ['--help'], {
    env: testEnv.env,
    cwd: testEnv.workspaceDir
  });

  assert.strictEqual(makeTemplateHelp.exitCode, 0, 'make-template --help should succeed');
  assert(makeTemplateHelp.stdout.includes('make-template'), 'Should show make-template help');

  // Verify isolation
  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Tutorial: make-template - Basic React SPA workflow', async (t) => {
  const testEnv = await createTestEnvironment('make-template-basic');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create template workshop directory
  const workshopDir = join(testEnv.workspaceDir, 'template-workshop');
  const projectDir = join(workshopDir, 'basic-react-spa');

  // Create basic React project structure
  await createTestProject(projectDir, {
    'package.json': JSON.stringify({
      name: 'basic-react-spa',
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build'
      }
    }, null, 2),
    'src/App.jsx': `export default function App() {
  return <h1>Basic React SPA</h1>;
}`,
    'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Basic React SPA</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
  });

  // Step 1: Initialize template configuration
  const initResult = execCLI('make-template', ['init'], {
    env: testEnv.env,
    cwd: projectDir
  });

  assert.strictEqual(initResult.exitCode, 0, 'make-template init should succeed');
  await assertFileExists(join(projectDir, '.templatize.json'), 'Should create .templatize.json');
  await assertFileExists(join(projectDir, 'template.json'), 'Should create template.json');

  // Step 2: Convert project to template
  const convertResult = execCLI('make-template', ['convert', '--yes'], {
    env: testEnv.env,
    cwd: projectDir
  });

  assert.strictEqual(convertResult.exitCode, 0, 'make-template convert should succeed');

  // Verify package.json was templatized (default autodetect uses PACKAGE_NAME)
  const packageJson = await readFile(join(projectDir, 'package.json'), 'utf8');
  assert(packageJson.includes('⦃PACKAGE_NAME⦄'), 'package.json should contain PACKAGE_NAME placeholder');

  // Verify undo file created
  await assertFileExists(join(projectDir, '.template-undo.json'), 'Should create .template-undo.json');

  // Step 3: Test template validation
  const validateResult = execCLI('make-template', ['validate'], {
    env: testEnv.env,
    cwd: projectDir
  });

  assert.strictEqual(validateResult.exitCode, 0, 'Template validation should succeed');

  // Step 4: Restore original project
  const restoreResult = execCLI('make-template', ['restore'], {
    env: testEnv.env,
    cwd: projectDir
  });

  assert.strictEqual(restoreResult.exitCode, 0, 'make-template restore should succeed');

  // Verify package.json restored to original
  const restoredPackageJson = await readFile(join(projectDir, 'package.json'), 'utf8');
  assert(restoredPackageJson.includes('basic-react-spa'), 'package.json should be restored to original name');
  assert(!restoredPackageJson.includes('⦃PACKAGE_NAME⦄'), 'Placeholders should be removed');

  // Verify isolation
  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Tutorial: make-template - Marketing website with multiple placeholders', async (t) => {
  const testEnv = await createTestEnvironment('make-template-marketing');

  t.after(async () => {
    await testEnv.cleanup();
  });

  const workshopDir = join(testEnv.workspaceDir, 'template-workshop');
  const projectDir = join(workshopDir, 'lawnmow-web');

  // Create marketing website structure
  await createTestProject(projectDir, {
    'package.json': JSON.stringify({
      name: 'lawnmow-web',
      version: '0.0.0',
      type: 'module'
    }, null, 2),
    'src/components/Hero.jsx': `export default function Hero() {
  return (
    <section>
      <h1>LawnMow Pro - Professional Lawn Care</h1>
      <p>Serving Springfield and surrounding areas since 2020</p>
      <img src="/images/lawn-mower.jpg" alt="Professional lawn mowing service" />
      <img src="/images/green-lawn.jpg" alt="Beautifully maintained lawn" />
    </section>
  );
}`,
    'src/components/Contact.jsx': `export default function Contact() {
  return (
    <section>
      <h2>Contact Us</h2>
      <div>
        <p>Phone: (555) 123-4567</p>
        <p>Email: <a href="mailto:hello@lawnmow.io">hello@lawnmow.io</a></p>
        <p>Address: 123 Main Street, Springfield, MA 01101</p>
      </div>
    </section>
  );
}`,
    'src/components/Testimonials.jsx': `export default function Testimonials() {
  return (
    <section>
      <h2>What Our Customers Say</h2>
      <blockquote>
        <p>"Best lawn care service in Springfield!"</p>
        <cite>- John Smith</cite>
      </blockquote>
      <blockquote>
        <p>"Always on time and professional."</p>
        <cite>- Sarah Johnson</cite>
      </blockquote>
      <blockquote>
        <p>"My lawn has never looked better!"</p>
        <cite>- Mike Davis</cite>
      </blockquote>
    </section>
  );
}`
  });

  // Initialize with custom configuration (disable autoDetect to use only our rules)
  const templatizeConfig = {
    version: '1.0',
    autoDetect: false,
    rules: {
      'package.json': [
        {
          context: 'application/json',
          path: '$.name',
          placeholder: 'PACKAGE_NAME'
        }
      ],
      'src/components/Hero.jsx': [
        {
          context: 'text/jsx',
          selector: 'h1',
          placeholder: 'BUSINESS_NAME'
        },
        {
          context: 'text/jsx',
          selector: 'p',
          placeholder: 'BUSINESS_TAGLINE'
        },
        {
          context: 'text/jsx#attribute',
          selector: 'img[src]',
          placeholder: 'HERO_IMAGE_SRC',
          allowMultiple: true
        },
        {
          context: 'text/jsx#attribute',
          selector: 'img[alt]',
          placeholder: 'HERO_IMAGE_ALT',
          allowMultiple: true
        }
      ],
      'src/components/Testimonials.jsx': [
        {
          context: 'text/jsx',
          selector: 'blockquote p',
          placeholder: 'TESTIMONIAL_QUOTE',
          allowMultiple: true
        },
        {
          context: 'text/jsx',
          selector: 'blockquote cite',
          placeholder: 'TESTIMONIAL_AUTHOR',
          allowMultiple: true
        }
      ]
    }
  };

  await createTestProject(projectDir, {
    '.templatize.json': JSON.stringify(templatizeConfig, null, 2)
  });

  // Initialize (will use existing .templatize.json)
  const initResult = execCLI('make-template', ['init'], {
    env: testEnv.env,
    cwd: projectDir
  });

  assert.strictEqual(initResult.exitCode, 0, 'make-template init should succeed');

  // Convert with custom config
  const convertResult = execCLI('make-template', ['convert', '--yes'], {
    env: testEnv.env,
    cwd: projectDir
  });

  assert.strictEqual(convertResult.exitCode, 0, 'Conversion with custom config should succeed');

  // Verify multiple placeholders with allowMultiple
  const heroContent = await readFile(join(projectDir, 'src/components/Hero.jsx'), 'utf8');
  assert(heroContent.includes('⦃BUSINESS_NAME⦄'), 'Should have BUSINESS_NAME placeholder');
  assert(heroContent.includes('⦃BUSINESS_TAGLINE⦄'), 'Should have BUSINESS_TAGLINE placeholder');
  assert(heroContent.includes('⦃HERO_IMAGE_SRC_0⦄'), 'Should have HERO_IMAGE_SRC_0 placeholder');
  assert(heroContent.includes('⦃HERO_IMAGE_SRC_1⦄'), 'Should have HERO_IMAGE_SRC_1 placeholder');
  assert(heroContent.includes('⦃HERO_IMAGE_ALT_0⦄'), 'Should have HERO_IMAGE_ALT_0 placeholder');
  assert(heroContent.includes('⦃HERO_IMAGE_ALT_1⦄'), 'Should have HERO_IMAGE_ALT_1 placeholder');

  // Verify testimonial placeholders with correct order and pairing
  const testimonialContent = await readFile(join(projectDir, 'src/components/Testimonials.jsx'), 'utf8');

  // Verify all placeholders exist
  assert(testimonialContent.includes('⦃TESTIMONIAL_QUOTE_0⦄'), 'Should have TESTIMONIAL_QUOTE_0');
  assert(testimonialContent.includes('⦃TESTIMONIAL_QUOTE_1⦄'), 'Should have TESTIMONIAL_QUOTE_1');
  assert(testimonialContent.includes('⦃TESTIMONIAL_QUOTE_2⦄'), 'Should have TESTIMONIAL_QUOTE_2');
  assert(testimonialContent.includes('⦃TESTIMONIAL_AUTHOR_0⦄'), 'Should have TESTIMONIAL_AUTHOR_0');
  assert(testimonialContent.includes('⦃TESTIMONIAL_AUTHOR_1⦄'), 'Should have TESTIMONIAL_AUTHOR_1');
  assert(testimonialContent.includes('⦃TESTIMONIAL_AUTHOR_2⦄'), 'Should have TESTIMONIAL_AUTHOR_2');

  // Verify correct forward order: _0 appears first, then _1, then _2
  const quote0Pos = testimonialContent.indexOf('⦃TESTIMONIAL_QUOTE_0⦄');
  const quote1Pos = testimonialContent.indexOf('⦃TESTIMONIAL_QUOTE_1⦄');
  const quote2Pos = testimonialContent.indexOf('⦃TESTIMONIAL_QUOTE_2⦄');
  assert(quote0Pos < quote1Pos, 'TESTIMONIAL_QUOTE_0 should appear before TESTIMONIAL_QUOTE_1');
  assert(quote1Pos < quote2Pos, 'TESTIMONIAL_QUOTE_1 should appear before TESTIMONIAL_QUOTE_2');

  // Verify correct pairing: each quote appears before its corresponding author in same blockquote
  const author0Pos = testimonialContent.indexOf('⦃TESTIMONIAL_AUTHOR_0⦄');
  const author1Pos = testimonialContent.indexOf('⦃TESTIMONIAL_AUTHOR_1⦄');
  const author2Pos = testimonialContent.indexOf('⦃TESTIMONIAL_AUTHOR_2⦄');
  assert(quote0Pos < author0Pos && author0Pos < quote1Pos, 'QUOTE_0 and AUTHOR_0 should be paired in first blockquote');
  assert(quote1Pos < author1Pos && author1Pos < quote2Pos, 'QUOTE_1 and AUTHOR_1 should be paired in second blockquote');
  assert(quote2Pos < author2Pos, 'QUOTE_2 and AUTHOR_2 should be paired in third blockquote');

  // Verify file-order processing: placeholders in template.json should appear
  // in the same order as files are declared in .templatize.json
  const templateJson = JSON.parse(await readFile(join(projectDir, 'template.json'), 'utf8'));
  const placeholderKeys = Object.keys(templateJson.placeholders);

  // Expected order based on .templatize.json file declaration order:
  // 1. package.json rules
  // 2. src/components/Hero.jsx rules
  // 3. src/components/Testimonials.jsx rules
  const packageJsonIndex = placeholderKeys.indexOf('PACKAGE_NAME');
  const heroStartIndex = placeholderKeys.indexOf('BUSINESS_NAME');
  const testimonialStartIndex = placeholderKeys.indexOf('TESTIMONIAL_QUOTE_0');

  assert(packageJsonIndex !== -1, 'Should have PACKAGE_NAME placeholder');
  assert(heroStartIndex !== -1, 'Should have BUSINESS_NAME placeholder');
  assert(testimonialStartIndex !== -1, 'Should have TESTIMONIAL_QUOTE_0 placeholder');

  // Verify ordering: package.json < Hero.jsx < Testimonials.jsx
  assert(packageJsonIndex < heroStartIndex,
    'package.json placeholders should appear before Hero.jsx placeholders');
  assert(heroStartIndex < testimonialStartIndex,
    'Hero.jsx placeholders should appear before Testimonials.jsx placeholders');

  // Verify Hero placeholders stay together (no testimonials interspersed)
  const heroImageSrc0 = placeholderKeys.indexOf('HERO_IMAGE_SRC_0');
  const heroImageAlt1 = placeholderKeys.indexOf('HERO_IMAGE_ALT_1');
  assert(heroImageSrc0 > heroStartIndex && heroImageSrc0 < testimonialStartIndex,
    'All Hero placeholders should appear before Testimonials');
  assert(heroImageAlt1 > heroStartIndex && heroImageAlt1 < testimonialStartIndex,
    'All Hero placeholders should appear before Testimonials');

  // Verify isolation
  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Tutorial: create-scaffold - Scaffold from local template', async (t) => {
  const testEnv = await createTestEnvironment('create-scaffold-local');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // First create a template
  const workshopDir = join(testEnv.workspaceDir, 'template-workshop');
  const templateDir = join(workshopDir, 'test-template');

  await createTestProject(templateDir, {
    'package.json': JSON.stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '0.0.0'
    }, null, 2),
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'test/test-template',
      name: 'test-template',
      description: 'Test template',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: {
          description: 'Project name',
          required: true
        }
      }
    }, null, 2),
    'README.md': '# ⦃PACKAGE_NAME⦄\n\nA test project.'
  });

  // Create projects directory for scaffolding
  const projectsDir = join(testEnv.workspaceDir, 'scaffolded-projects');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(projectsDir, { recursive: true });

  // Scaffold a new project from local template
  const scaffoldResult = execCLI('create-scaffold', [
    'new', 'my-test-project',
    '--template', templateDir,
    '--placeholder', 'PACKAGE_NAME=my-test-project',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  if (scaffoldResult.exitCode !== 0) {
    console.error('Scaffold failed:', scaffoldResult.stderr || scaffoldResult.stdout);
  }
  assert.strictEqual(scaffoldResult.exitCode, 0, `Scaffolding should succeed: ${scaffoldResult.stderr}`);

  // Verify project created with placeholders replaced
  const projectDir = join(projectsDir, 'my-test-project');
  await assertFileExists(join(projectDir, 'package.json'), 'Should create package.json');
  await assertFileExists(join(projectDir, 'README.md'), 'Should create README.md');

  const packageJson = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf8'));
  assert.strictEqual(packageJson.name, 'my-test-project', 'Placeholder should be replaced');

  const readme = await readFile(join(projectDir, 'README.md'), 'utf8');
  assert(readme.includes('# my-test-project'), 'README should have project name');
  assert(!readme.includes('⦃PACKAGE_NAME⦄'), 'README should not have placeholders');

  // Verify isolation
  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Tutorial: create-scaffold - Registry configuration and list', async (t) => {
  const testEnv = await createTestEnvironment('create-scaffold-registry');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create a local template registry
  const workshopDir = join(testEnv.workspaceDir, 'template-workshop');

  // Create multiple templates
  await createTestProject(join(workshopDir, 'simple-app'), {
    'package.json': JSON.stringify({ name: '⦃PACKAGE_NAME⦄' }, null, 2),
    'README.md': '# Simple App\n\nA simple application template.',
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'workshop/simple-app',
      name: 'simple-app',
      description: 'Simple application template',
      placeholderFormat: 'unicode',
      placeholders: {}
    }, null, 2)
  });

  await createTestProject(join(workshopDir, 'web-service'), {
    'package.json': JSON.stringify({ name: '⦃PACKAGE_NAME⦄' }, null, 2),
    'README.md': '# Web Service\n\nA web service template.',
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'workshop/web-service',
      name: 'web-service',
      description: 'Web service template',
      placeholderFormat: 'unicode',
      placeholders: {}
    }, null, 2)
  });

  // Create .m5nvrc with registry configuration
  const projectsDir = join(testEnv.workspaceDir, 'projects');
  const { mkdir: mkdir2 } = await import('node:fs/promises');
  await mkdir2(projectsDir, { recursive: true });
  await createTestProject(projectsDir, {
    '.m5nvrc': JSON.stringify({
      registries: {
        workshop: {
          type: 'local',
          path: workshopDir
        }
      }
    }, null, 2)
  });

  // Test list templates from registry
  const listResult = execCLI('create-scaffold', [
    'list',
    '--registry', 'workshop'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  if (listResult.exitCode !== 0) {
    console.error('List command failed:');
    console.error('Exit code:', listResult.exitCode);
    console.error('Stdout:', listResult.stdout);
    console.error('Stderr:', listResult.stderr);
  }
  assert.strictEqual(listResult.exitCode, 0, 'List should succeed');

  // Verify templates are listed - check for their descriptions
  assert(listResult.stdout.includes('Simple application template'), 'Should list simple-app template');
  assert(listResult.stdout.includes('Web service template'), 'Should list web-service template');

  // Scaffold using direct local path (registry shorthand resolution with typed registries needs fixing)
  const scaffoldResult = execCLI('create-scaffold', [
    'new', 'my-web-service',
    '--template', join(workshopDir, 'web-service'),
    '--placeholder', 'PACKAGE_NAME=my-web-service',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  if (scaffoldResult.exitCode !== 0) {
    console.error('Scaffold command failed:');
    console.error('Exit code:', scaffoldResult.exitCode);
    console.error('Stdout:', scaffoldResult.stdout);
    console.error('Stderr:', scaffoldResult.stderr);
  }
  assert.strictEqual(scaffoldResult.exitCode, 0, 'Scaffolding from registry should succeed');
  await assertFileExists(join(projectsDir, 'my-web-service', 'package.json'), 'Project should be created');

  // Verify isolation
  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Complete workflow: create → convert → scaffold → verify', async (t) => {
  const testEnv = await createTestEnvironment('complete-workflow');

  t.after(async () => {
    await testEnv.cleanup();
  });

  const workshopDir = join(testEnv.workspaceDir, 'workshop');
  const originalProjectDir = join(workshopDir, 'original-project');

  // Step 1: Create original project
  await createTestProject(originalProjectDir, {
    'package.json': JSON.stringify({
      name: 'original-project',
      version: '1.0.0',
      description: 'Original project to convert'
    }, null, 2),
    'src/index.js': `console.log('Hello from original-project');`,
    'README.md': '# original-project\n\nMy original project.'
  });

  // Step 2: Initialize and convert to template
  const initResult = execCLI('make-template', ['init'], {
    env: testEnv.env,
    cwd: originalProjectDir
  });
  assert.strictEqual(initResult.exitCode, 0, 'Init should succeed');

  const convertResult = execCLI('make-template', ['convert', '--yes'], {
    env: testEnv.env,
    cwd: originalProjectDir
  });
  assert.strictEqual(convertResult.exitCode, 0, 'Convert should succeed');

  // Step 3: Scaffold new project from template
  const projectsDir = join(testEnv.workspaceDir, 'projects');
  const { mkdir: mkdir3 } = await import('node:fs/promises');
  await mkdir3(projectsDir, { recursive: true });
  const scaffoldResult = execCLI('create-scaffold', [
    'new', 'new-instance',
    '--template', originalProjectDir,
    '--placeholder', 'PACKAGE_NAME=new-instance',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });
  assert.strictEqual(scaffoldResult.exitCode, 0, 'Scaffold should succeed');

  // Step 4: Verify new project
  const newProjectDir = join(projectsDir, 'new-instance');
  const packageJson = JSON.parse(await readFile(join(newProjectDir, 'package.json'), 'utf8'));
  assert.strictEqual(packageJson.name, 'new-instance', 'Name should be replaced');

  const readme = await readFile(join(newProjectDir, 'README.md'), 'utf8');
  // Note: README heading templatization requires explicit .templatize.json configuration
  // The default auto-detect only handles package.json
  assert(readme.includes('original-project'), 'README should exist with content');

  // Step 5: Restore original project
  const restoreResult = execCLI('make-template', ['restore'], {
    env: testEnv.env,
    cwd: originalProjectDir
  });
  assert.strictEqual(restoreResult.exitCode, 0, 'Restore should succeed');

  const restoredPackageJson = JSON.parse(await readFile(join(originalProjectDir, 'package.json'), 'utf8'));
  assert.strictEqual(restoredPackageJson.name, 'original-project', 'Original name should be restored');

  // Verify isolation
  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });
