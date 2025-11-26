#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import {
  createTestEnvironment,
  assertFileExists,
  createTestProject,
  verifyIsolation
} from './test-helpers.mjs';
import { GuidedSetupWorkflow } from '../../bin/create-scaffold/modules/guided-setup-workflow.mts';
import { CacheManager } from '../../bin/create-scaffold/modules/cache-manager.mts';

const LONG_TIMEOUT = 180000; // 3 minutes for full guided flows

function stringify(value) {
  return JSON.stringify(value, null, 2);
}

class TestLogger {
  constructor() {
    this.debugLogs = [];
    this.infoLogs = [];
    this.warnLogs = [];
    this.errorLogs = [];
    this.fileCopies = [];
    this.operations = [];
  }

  async debug(...args) {
    this.debugLogs.push(args);
  }

  async info(...args) {
    this.infoLogs.push(args);
  }

  async warn(...args) {
    this.warnLogs.push(args);
  }

  async logFileCopy(detail) {
    this.fileCopies.push(detail);
  }

  async logOperation(detail) {
    this.operations.push(detail);
  }

  async logError(...args) {
    this.errorLogs.push(args);
  }

  table() {
    // no-op for tests
  }
}

const promptAdapter = () => {
  const writes = [];
  return {
    writes,
    async write(message = '') {
      writes.push(message);
    },
    async question() {
      return '1';
    }
  };
};

async function runGuidedWorkflow({
  testEnv,
  templateDir,
  templateJson,
  projectName,
  selectionOverrides = {},
  placeholderValues = {}
}) {
  const projectsDir = join(testEnv.workspaceDir, 'projects');
  await mkdir(projectsDir, { recursive: true });
  const projectDir = join(projectsDir, projectName);

  const cacheDir = join(testEnv.workspaceDir, '.cache');
  await mkdir(cacheDir, { recursive: true });

  const cacheManager = new CacheManager(cacheDir);
  const logger = new TestLogger();
  const prompt = promptAdapter();

  const selectionFilePath = join(testEnv.workspaceDir, `${templateJson.name}-selections.json`);
  await writeFile(selectionFilePath, stringify({
    templateId: templateJson.id,
    version: templateJson.schemaVersion,
    selections: selectionOverrides
  }));

  const optionTokens = Object.entries(selectionOverrides).map(([dimension, value]) => {
    const valuesArray = Array.isArray(value) ? value : [value];
    return `${dimension}=${valuesArray.join('+')}`;
  });

  const options = {
    raw: optionTokens,
    byDimension: Object.fromEntries(
      Object.entries(selectionOverrides).map(([dimension, value]) => [
        dimension,
        Array.isArray(value) ? value : [value]
      ])
    )
  };

  const originalEnv = {};
  for (const [key, value] of Object.entries(testEnv.env)) {
    originalEnv[key] = process.env[key];
    process.env[key] = value;
  }

  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  const originalCwd = process.cwd();
  process.chdir(projectsDir);

  const workflow = new GuidedSetupWorkflow({
    cacheManager,
    logger,
    promptAdapter: prompt,
    projectDirectory: projectName,
    templatePath: templateDir,
    templateName: templateJson.name,
    repoUrl: templateDir,
    branchName: 'main',
    options,
    placeholders: placeholderValues,
    metadata: templateJson,
    selectionFilePath
  });

  try {
    const result = await workflow.executeWorkflow();
    return {
      result,
      logger,
      prompt,
      projectDir,
      selectionFilePath
    };
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    process.chdir(originalCwd);
    for (const [key, value] of Object.entries(originalEnv)) {
      if (typeof value === 'undefined') {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('Guided workflow executes setup runtime tools end-to-end', async (t) => {
  const testEnv = await createTestEnvironment('guided-workflow-success');

  t.after(async () => {
    await testEnv.cleanup();
  });

  const templateDir = join(testEnv.workspaceDir, 'templates', 'guided-success');
  const templateJson = {
    schemaVersion: '1.0.0',
    id: 'guided/e2e',
    name: 'guided-success',
    description: 'Covers setup runtime tools API',
    placeholderFormat: 'unicode',
    placeholders: {
      PACKAGE_NAME: {
        description: 'Project name',
        required: true
      },
      AUTHOR_NAME: {
        description: 'Author name',
        required: false,
        default: 'Example Author'
      }
    },
    dimensions: {
      deployment: {
        type: 'single',
        values: ['node-basic'],
        default: 'node-basic',
        description: 'Deployment target'
      },
      features: {
        type: 'multi',
        values: ['docs', 'testing'],
        default: [],
        description: 'Feature toggles'
      }
    },
    constants: {
      org: 'Million Views'
    },
    setup: {
      authorAssetsDir: '__scaffold__'
    },
    authorAssetsDir: '__scaffold__'
  };

  const successSetupScript = `
export default async function setup({ ctx, tools }) {
  const { placeholders, files, json, templates, text, logger, options, inputs } = tools;
  const projectName = ctx.projectName;
  const owner = inputs.get('AUTHOR_NAME', 'Unknown Owner');
  const org = ctx.constants?.org || 'unknown-org';
  const repoUrl = inputs.get('REPO_URL', 'not-provided');

  await files.ensureDirs(['docs', 'docs/archive', 'docs/assets', 'src/generated', 'assets/images']);
  await files.ensureDirs('docs/journal');

  await files.copy('README.md', 'README.seed.md', { overwrite: true });
  await files.move('README.seed.md', 'docs/archive/README.seed.md', { overwrite: false });

  await files.write('docs/README.seed.md', 'stale copy', { overwrite: true });
  await files.move('docs/archive/README.seed.md', 'docs/README.seed.md', { overwrite: true });

  await files.write('docs/generated/info.txt', [
    'Project: ' + projectName,
    'Owner: ' + owner,
    'Org: ' + org
  ]);

  await files.write('docs/journal/log.txt', 'journal entry for ' + projectName);
  await files.write('assets/binary.bin', '01020304');
  await files.write('docs/new-file.txt', 'temporary', { overwrite: false });

  try {
    await files.write('docs/new-file.txt', 'second write', { overwrite: false });
  } catch (error) {
    logger.warn('Expected write guard triggered');
    logger.warn('Write guard context', { file: 'docs/new-file.txt' });
  }

  await files.copy('src/index.js', 'src/legacy.js', { overwrite: true });
  await files.write('temp-artifact.txt', 'cleanup target');
  await files.remove('temp-artifact.txt');
  await files.remove('docs/archive');

  await templates.renderFile('instructions.txt', 'docs/INSTRUCTIONS.md', {
    PROJECT_LABEL: projectName
  });
  await templates.copy('extras/gitignore', '.gitignore', { overwrite: true });
  const banner = templates.renderString('## Banner for ⦃PACKAGE_NAME⦄\\nOwner: ⦃AUTHOR_NAME⦄', {});
  await files.write('docs/BANNER.md', banner);
  await files.write('docs/PLACEHOLDERS.md', [
    'Doc owner: ⦃DOC_OWNER⦄',
    'Build: ⦃BUILD_ID⦄'
  ]);

  await placeholders.replaceInFile('README.md', {
    PROJECT_HEADING: projectName
  });
  await placeholders.replaceAll({ DOC_OWNER: owner }, ['docs/**/*.md']);
  await placeholders.applyInputs('docs/**/*.md', { BUILD_ID: 42 });
  await placeholders.applyInputs('src/**/*.js', { CUSTOM_FLAG: 'ENABLED' });

  await json.merge('package.json', {
    scripts: { test: 'node test.js' },
    metadata: { owner },
    engines: { node: '>=18' }
  });
  await json.set('package.json', 'contributors[0].role', 'maintainer');
  await json.set('package.json', 'contributors[0].links[0]', 'https://example.com');
  await json.addToArray('package.json', 'keywords', 'guided', { unique: true });
  await json.addToArray('package.json', 'keywords', 'guided', { unique: true });
  await json.mergeArray('package.json', 'contributors', [{ name: owner }], { unique: true });
  await json.update('package.json', (draft) => {
    draft.scripts.start = 'node server.js';
  });
  await json.remove('package.json', 'metadata.owner');

  const snapshot = await json.read('package.json');
  await files.write('docs/package-snapshot.json', JSON.stringify(snapshot, null, 2));

  await text.insertAfter({
    file: 'README.md',
    marker: '# Guided Template',
    block: [
      '## Setup Tasks',
      '- [x] Generated via setup runtime'
    ]
  });
  await text.ensureBlock({
    file: 'README.md',
    marker: '## Setup Tasks',
    block: '- [x] Generated via setup runtime'
  });

  const selectedFeatures = options.list('features') || [];
  const featureSummary = selectedFeatures.length > 0
    ? '- Features: ' + selectedFeatures.join(', ')
    : '- Features: none';
  await text.replaceBetween({
    file: 'README.md',
    start: '<!-- features:start -->',
    end: '<!-- features:end -->',
    block: [
      '- Updated by setup runtime',
      featureSummary
    ]
  });
  await text.appendLines({
    file: 'README.md',
    lines: ['## Footnotes', 'See docs directory']
  });
  await text.appendLines({
    file: 'README.md',
    lines: ['Org: ' + org]
  });
  await text.appendLines({
    file: 'docs/NOTES.md',
    lines: ['Initial note']
  });
  await text.appendLines({
    file: 'docs/NOTES.md',
    lines: ['Second note']
  });
  await text.replace({
    file: 'README.md',
    search: 'Guided Template',
    replace: 'Guided Template (Updated)',
    ensureMatch: true
  });
  await text.replace({
    file: 'README.md',
    search: 'Non-existent marker',
    replace: 'Should not appear',
    ensureMatch: false
  });

  await text.replace({
    file: 'src/index.js',
    search: 'console.log',
    replace: 'console.info',
    ensureMatch: true
  });

  const defaultList = options.list() || [];
  const rawTokens = options.raw();
  const features = selectedFeatures;
  if (options.has('testing')) {
    await text.appendLines({
      file: 'README.md',
      lines: ['Testing feature enabled']
    });
  }
  await options.when('docs', async () => {
    await text.appendLines({
      file: 'README.md',
      lines: ['Docs feature enabled']
    });
  });
  if (options.in('features', 'docs')) {
    await text.appendLines({
      file: 'README.md',
      lines: ['Docs dimension detected']
    });
  }
  options.require('features', 'docs');
  options.require('testing');

  const dimensions = options.dimensions();
  const inputsSnapshot = inputs.all();
  await files.write('docs/features.json', JSON.stringify({
    features,
    defaultList,
    rawTokens,
    dimensions,
    inputs: inputsSnapshot,
    repoUrl
  }, null, 2));

  await files.write('docs/generated/constants.txt', 'Org: ' + org);

  logger.info('Org context: ' + org);
  logger.info('Setup complete', { project: projectName, selections: defaultList.length });
  logger.table([{ key: 'features', value: features.join(', ') }]);
}
`;

  await createTestProject(templateDir, {
    'template.json': stringify(templateJson),
    'package.json': stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '0.0.1',
      description: 'Guided workflow template',
      keywords: ['starter'],
      contributors: [{ name: 'Template Author' }],
      scripts: {
        start: 'node src/index.js'
      },
      metadata: {
        owner: 'template'
      }
    }),
    'README.md': `# Guided Template\n\nMaintainer: ⦃AUTHOR_NAME⦄\n\nProject heading: ⦃PROJECT_HEADING⦄\n\n<!-- features:start -->\n- Base feature\n<!-- features:end -->\n`,
    'src/index.js': `export function start() {\n  console.log('Booting ⦃PACKAGE_NAME⦄');\n  console.log('Flag', '⦃CUSTOM_FLAG⦄');\n}\n\nstart();\n`,
    'docs/ABOUT.md': `# About\nDoc owner: ⦃DOC_OWNER⦄\nBuild: ⦃BUILD_ID⦄\n`,
    '_setup.mjs': successSetupScript,
    '__scaffold__/instructions.txt': 'Project Label: ⦃PROJECT_LABEL⦄\n',
    '__scaffold__/extras/gitignore': 'node_modules/\n.env\n'
  });

  const projectName = 'guided-e2e-app';
  const { result, projectDir, selectionFilePath } = await runGuidedWorkflow({
    testEnv,
    templateDir,
    templateJson,
    projectName,
    selectionOverrides: {
      deployment: 'node-basic',
      features: ['docs', 'testing']
    },
    placeholderValues: {
      PACKAGE_NAME: 'guided-e2e-app',
      AUTHOR_NAME: 'E2E Tester'
    }
  });

  assert.ok(result.success, 'Guided workflow should succeed');
  await assertFileExists(join(projectDir, 'package.json'), 'package.json should exist');
  await assertFileExists(join(projectDir, 'docs', 'INSTRUCTIONS.md'), 'instructions should be rendered');
  await assertFileExists(join(projectDir, 'docs', 'BANNER.md'), 'banner should be rendered');
  await assertFileExists(join(projectDir, 'docs', 'features.json'), 'features summary should exist');
  await assertFileExists(join(projectDir, 'docs', 'package-snapshot.json'), 'snapshot should exist');
  await assertFileExists(join(projectDir, 'src', 'legacy.js'), 'legacy copy should exist');
  await assertFileExists(join(projectDir, '.gitignore'), '.gitignore should be copied');
  await assertFileExists(join(projectDir, 'docs', 'README.seed.md'), 'moved README copy should exist');
  await assertFileExists(join(projectDir, 'docs', 'generated', 'info.txt'), 'generated info should exist');
  await assertFileExists(join(projectDir, 'docs', 'generated', 'constants.txt'), 'constants file should exist');
  await assertFileExists(join(projectDir, 'assets', 'binary.bin'), 'binary asset should exist');
  await assertFileExists(join(projectDir, 'docs', 'journal', 'log.txt'), 'journal log should exist');

  const packageJson = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf8'));
  assert.strictEqual(packageJson.name, 'guided-e2e-app');
  assert.strictEqual(packageJson.scripts.test, 'node test.js');
  assert.strictEqual(packageJson.scripts.start, 'node server.js');
  assert(packageJson.keywords.includes('guided'), 'keywords should be updated');
  assert.ok(packageJson.contributors.some(contrib => contrib.name === 'E2E Tester'), 'contributor should include author');
  assert.strictEqual(packageJson.contributors[0].role, 'maintainer');
  assert.strictEqual(packageJson.engines.node, '>=18');

  const snapshot = JSON.parse(await readFile(join(projectDir, 'docs', 'package-snapshot.json'), 'utf8'));
  assert.deepStrictEqual(snapshot, packageJson, 'snapshot should match package.json');

  const readme = await readFile(join(projectDir, 'README.md'), 'utf8');
  assert(readme.includes('Testing feature enabled'), 'README should mention testing feature');
  assert(readme.includes('Docs feature enabled'), 'README should mention docs feature');
  assert(readme.includes('Docs dimension detected'), 'README should include dimension notice');
  assert(readme.includes('Org: Million Views'), 'README should include org reference');
  assert(!readme.includes('⦃'), 'README should not contain placeholder tokens');

  const notes = await readFile(join(projectDir, 'docs', 'NOTES.md'), 'utf8');
  assert(notes.includes('Initial note') && notes.includes('Second note'), 'Notes should include appended lines');

  const placeholdersDoc = await readFile(join(projectDir, 'docs', 'PLACEHOLDERS.md'), 'utf8');
  assert(placeholdersDoc.includes('Doc owner: E2E Tester'), 'Doc owner placeholder should resolve');
  assert(placeholdersDoc.includes('Build: 42'), 'Build placeholder should resolve');

  const instructions = await readFile(join(projectDir, 'docs', 'INSTRUCTIONS.md'), 'utf8');
  assert(instructions.includes('Project Label: guided-e2e-app'), 'Instructions should be rendered with project name');

  const bannerContent = await readFile(join(projectDir, 'docs', 'BANNER.md'), 'utf8');
  assert(bannerContent.includes('guided-e2e-app'), 'Banner should include project name');
  assert(!bannerContent.includes('⦃'), 'Banner should have placeholders resolved');

  const indexJs = await readFile(join(projectDir, 'src', 'index.js'), 'utf8');
  assert(indexJs.includes('console.info'), 'console statements should be converted');
  assert(indexJs.includes('ENABLED'), 'Custom flag placeholder should be replaced');
  assert(!indexJs.includes('⦃CUSTOM_FLAG⦄'), 'index.js should not include unresolved tokens');

  const legacyJs = await readFile(join(projectDir, 'src', 'legacy.js'), 'utf8');
  assert(legacyJs.includes('guided-e2e-app'), 'Legacy copy should match replaced content');

  const featuresJson = JSON.parse(await readFile(join(projectDir, 'docs', 'features.json'), 'utf8'));
  assert.deepStrictEqual(featuresJson.features.sort(), ['docs', 'testing']);
  assert.deepStrictEqual(featuresJson.dimensions.features.sort(), ['docs', 'testing']);
  assert.strictEqual(featuresJson.inputs.PACKAGE_NAME, 'guided-e2e-app');
  assert.strictEqual(featuresJson.inputs.AUTHOR_NAME, 'E2E Tester');
  assert.strictEqual(featuresJson.repoUrl, 'not-provided');
  assert.deepStrictEqual(featuresJson.defaultList.sort(), ['deployment=node-basic', 'features=docs+testing'].sort(), 'default list should reflect selection tokens');
  assert.deepStrictEqual(featuresJson.rawTokens.sort(), ['deployment=node-basic', 'features=docs+testing'].sort(), 'raw token cache should match selection tokens');

  const gitignore = await readFile(join(projectDir, '.gitignore'), 'utf8');
  assert(gitignore.includes('node_modules/'), '.gitignore should include node_modules');

  const journalLog = await readFile(join(projectDir, 'docs', 'journal', 'log.txt'), 'utf8');
  assert(journalLog.includes('guided-e2e-app'), 'Journal log should include project name');

  const binaryAsset = await readFile(join(projectDir, 'assets', 'binary.bin'));
  assert.strictEqual(binaryAsset.length, 8, 'Binary file should have expected length');

  const newFileContents = await readFile(join(projectDir, 'docs', 'new-file.txt'), 'utf8');
  assert.strictEqual(newFileContents, 'temporary', 'original file should remain after failed overwrite');

  await assert.rejects(access(join(projectDir, '_setup.mjs')), 'setup script should be removed');
  await assert.rejects(access(join(projectDir, '__scaffold__')), 'author assets should be cleaned up');
  await assert.rejects(access(join(projectDir, 'docs', 'archive')), 'archive directory should be removed');
  await assert.rejects(access(join(projectDir, 'temp-artifact.txt')), 'temp artifact should be removed');

  await assertFileExists(selectionFilePath, 'selection file should be generated');
  const selectionContent = JSON.parse(await readFile(selectionFilePath, 'utf8'));
  assert.strictEqual(selectionContent.templateId, templateJson.id, 'Selection file should reference template id');
  assert.deepStrictEqual(selectionContent.selections, {
    deployment: 'node-basic',
    features: ['docs', 'testing']
  });

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Guided workflow logs sandbox violations without blocking scaffolding', async (t) => {
  const testEnv = await createTestEnvironment('guided-workflow-sandbox');

  t.after(async () => {
    await testEnv.cleanup();
  });

  const templateDir = join(testEnv.workspaceDir, 'templates', 'guided-sandbox');
  const templateJson = {
    schemaVersion: '1.0.0',
    id: 'guided/sandbox',
    name: 'guided-sandbox',
    description: 'Triggers setup sandbox violations',
    placeholderFormat: 'unicode',
    placeholders: {
      PACKAGE_NAME: {
        description: 'Project name',
        required: true
      }
    },
    dimensions: {
      deployment: {
        type: 'single',
        values: ['node-basic'],
        default: 'node-basic'
      }
    },
    authorAssetsDir: '__scaffold__'
  };

  const failingSetupScript = `
import fs from 'node:fs';

export default async function setup() {
  await fs.promises.writeFile('should-not-run.txt', 'sandbox breach');
}
`;

  await createTestProject(templateDir, {
    'template.json': stringify(templateJson),
    'package.json': stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '0.1.0'
    }),
    'README.md': '# Sandbox Template\n',
    '_setup.mjs': failingSetupScript,
    '__scaffold__/extras/gitignore': 'node_modules/\n'
  });

  const capturedErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => {
    capturedErrors.push(args.join(' '));
  };

  let workflowArtifacts;
  try {
    workflowArtifacts = await runGuidedWorkflow({
      testEnv,
      templateDir,
      templateJson,
      projectName: 'sandbox-app',
      selectionOverrides: {
        deployment: 'node-basic'
      },
      placeholderValues: {
        PACKAGE_NAME: 'sandbox-app'
      }
    });
  } finally {
    console.error = originalConsoleError;
  }

  const { result, projectDir, prompt, selectionFilePath } = workflowArtifacts;
  assert.ok(result.success, 'Scaffolding should complete despite sandbox warning');
  assert(capturedErrors.some(line => line.includes('Warning: Setup script failed, continuing with setup.')), 'console warning should mention setup failure');
  assert(prompt.writes.some(line => line.includes('Import is disabled inside setup scripts')), 'prompt output should mention sandbox restriction');
  await assertFileExists(join(projectDir, 'package.json'), 'package.json should exist');
  await assert.rejects(access(join(projectDir, 'should-not-run.txt')), 'sandboxed file should not be created');
  await assert.rejects(access(join(projectDir, '_setup.mjs')), 'failing setup script should be removed');
  await assert.rejects(access(join(projectDir, '__scaffold__')), 'author assets should be removed even on failure');

  const packageJson = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf8'));
  assert.strictEqual(packageJson.name, 'sandbox-app');

  await assertFileExists(selectionFilePath, 'selection file should still be generated');
  const sandboxSelection = JSON.parse(await readFile(selectionFilePath, 'utf8'));
  assert.strictEqual(sandboxSelection.templateId, templateJson.id, 'selection file should reference sandbox template');
  assert.deepStrictEqual(sandboxSelection.selections, { deployment: 'node-basic' }, 'selection file should capture deployment choice');

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });
