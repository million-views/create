#!/usr/bin/env node

/**
 * L2 Unit Tests for security.mjs validation functions
 *
 * These tests validate business logic ONLY - no filesystem operations.
 * Per testing.md: L2 tests work with pure data transformation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Package identity functions
import {
  getPackageName,
  generateInstallationInstructions,
  generatePackageValidationError,
  validatePackageName,
  validatePackageIdentity
} from '../../lib/security/identity.mts';

// Error types
import { ValidationError } from '@m5nv/create/lib/error/validation.mts';

// Sanitization functions
import {
  sanitizePath,
  sanitizeBranchName,
  sanitizeErrorMessage
} from '../../lib/security/sanitize.mts';

// CLI input validation functions
import {
  validateRepoUrl,
  validateTemplateName,
  validateProjectDirectory,
  validateAllInputs
} from '@m5nv/create/lib/validation/cli/input.mts';

// CLI option validation functions
import {
  validateIdeParameter,
  validateAuthoringMode,
  validateAuthorAssetsDir,
  validateLogFilePath,
  validateCacheTtl
} from '@m5nv/create/lib/validation/cli/option.mts';

// Domain validation
import { validateDimensionsMetadata } from '../../lib/validation/domain/dimension.mts';

// =============================================================================
// Package Identity Functions (Low coverage area)
// =============================================================================

test('Package Identity Functions', async (t) => {
  await t.test('getPackageName returns correct package name', () => {
    const name = getPackageName();
    assert.equal(name, '@m5nv/create');
  });

  await t.test('generateInstallationInstructions includes package name', () => {
    const instructions = generateInstallationInstructions();
    assert.ok(instructions.includes('@m5nv/create'));
    assert.ok(instructions.includes('npm create'));
    assert.ok(instructions.includes('npx'));
  });

  await t.test('generatePackageValidationError formats error correctly', () => {
    const error = generatePackageValidationError('wrong-package');
    assert.ok(error.includes('wrong-package'));
    assert.ok(error.includes('@m5nv/create'));
  });

  await t.test('validatePackageName accepts correct package name', () => {
    const result = validatePackageName('@m5nv/create');
    assert.equal(result, true);
  });

  await t.test('validatePackageName rejects incorrect package name', () => {
    assert.throws(
      () => validatePackageName('wrong-package'),
      ValidationError
    );
  });

  await t.test('validatePackageName rejects empty string', () => {
    assert.throws(
      () => validatePackageName(''),
      ValidationError
    );
  });

  await t.test('validatePackageName rejects null/undefined', () => {
    assert.throws(() => validatePackageName(null), ValidationError);
    assert.throws(() => validatePackageName(undefined), ValidationError);
  });

  await t.test('validatePackageIdentity passes for correct setup', () => {
    const result = validatePackageIdentity();
    assert.equal(result, true);
  });
});

// =============================================================================
// sanitizePath Function
// Note: sanitizePath returns the NORMALIZED relative path, not the resolved absolute path
// =============================================================================

test('sanitizePath Function', async (t) => {
  await t.test('returns normalized relative path', () => {
    // sanitizePath returns the normalized relative path, not absolute
    const result = sanitizePath('subdir/file.txt', '/safe/root');
    assert.equal(result, 'subdir/file.txt');
  });

  await t.test('blocks path traversal with ../', () => {
    assert.throws(
      () => sanitizePath('../../../etc/passwd', '/safe/root'),
      ValidationError
    );
  });

  await t.test('blocks null bytes', () => {
    assert.throws(
      () => sanitizePath('file\0.txt', '/safe/root'),
      ValidationError
    );
  });

  await t.test('blocks absolute paths', () => {
    // sanitizePath rejects ALL absolute paths
    assert.throws(
      () => sanitizePath('/etc/passwd', '/safe/root'),
      ValidationError
    );
  });

  await t.test('normalizes internal ../ that stays in bounds', () => {
    // dir/../file.txt normalizes to file.txt (still in bounds)
    const result = sanitizePath('dir/../file.txt', '/safe/root');
    assert.equal(result, 'file.txt');
  });

  await t.test('blocks ../ that escapes bounds', () => {
    // Multiple ../.. that would escape bounds are blocked
    assert.throws(
      () => sanitizePath('dir/../../etc', '/safe/root'),
      ValidationError
    );
  });

  await t.test('rejects non-string input', () => {
    assert.throws(
      () => sanitizePath(123, '/safe/root'),
      ValidationError
    );
  });

  await t.test('rejects empty string', () => {
    assert.throws(
      () => sanitizePath('', '/safe/root'),
      ValidationError
    );
  });
});

// =============================================================================
// validateRepoUrl Function
// Note: validateRepoUrl requires user/repo format or proper URLs, not "user/repo" shorthand
// =============================================================================

test('validateRepoUrl Function', async (t) => {
  await t.test('accepts valid user/repo format', () => {
    const validUrls = [
      'user/repo',
      'org-name/project-name'
    ];

    for (const url of validUrls) {
      const result = validateRepoUrl(url);
      assert.equal(result, url, `Should accept: ${url}`);
    }
  });

  await t.test('accepts valid full URLs', () => {
    const validUrls = [
      'https://github.com/user/repo',
      'https://github.com/user/repo.git',
      'http://gitlab.com/user/repo'
    ];

    for (const url of validUrls) {
      const result = validateRepoUrl(url);
      assert.equal(result, url, `Should accept: ${url}`);
    }
  });

  await t.test('accepts local paths', () => {
    const localPaths = [
      '/absolute/path',
      './relative/path',
      '~/home/path'
    ];

    for (const localPath of localPaths) {
      const result = validateRepoUrl(localPath);
      assert.equal(result, localPath);
    }
  });

  await t.test('rejects injection attempts in user/repo format', () => {
    // user/repo format must match strict pattern
    const maliciousUrls = [
      'user/repo; rm -rf /',
      'user/repo && malicious',
      'user/repo | evil'
    ];

    for (const url of maliciousUrls) {
      assert.throws(
        () => validateRepoUrl(url),
        ValidationError,
        `Should reject: ${url}`
      );
    }
  });

  await t.test('rejects null bytes', () => {
    assert.throws(
      () => validateRepoUrl('user/repo\0'),
      ValidationError
    );
  });

  await t.test('rejects javascript: protocol', () => {
    assert.throws(
      () => validateRepoUrl('javascript:alert(1)'), // eslint-disable-line no-script-url
      ValidationError
    );
  });

  await t.test('rejects non-string input', () => {
    assert.throws(() => validateRepoUrl(123), ValidationError);
    assert.throws(() => validateRepoUrl(null), ValidationError);
  });

  await t.test('rejects private network URLs', () => {
    const privateUrls = [
      'https://localhost/user/repo',
      'https://127.0.0.1/user/repo',
      'https://192.168.1.1/user/repo'
    ];

    for (const url of privateUrls) {
      assert.throws(
        () => validateRepoUrl(url),
        ValidationError,
        `Should reject: ${url}`
      );
    }
  });
});

// =============================================================================
// sanitizeBranchName Function
// =============================================================================

test('sanitizeBranchName Function', async (t) => {
  await t.test('accepts valid branch names', () => {
    const validBranches = [
      'main',
      'develop',
      'feature/new-feature',
      'release-1.0.0',
      'hotfix_urgent'
    ];

    for (const branch of validBranches) {
      const result = sanitizeBranchName(branch);
      assert.ok(result, `Should accept: ${branch}`);
    }
  });

  await t.test('rejects injection attempts', () => {
    const maliciousBranches = [
      'main; rm -rf /',
      'develop && evil',
      'feature|pipe',
      'branch`whoami`',
      'branch$(id)'
    ];

    for (const branch of maliciousBranches) {
      assert.throws(
        () => sanitizeBranchName(branch),
        ValidationError,
        `Should reject: ${branch}`
      );
    }
  });

  await t.test('rejects path traversal', () => {
    assert.throws(
      () => sanitizeBranchName('../../../etc/passwd'),
      ValidationError
    );
  });

  await t.test('rejects null bytes', () => {
    assert.throws(
      () => sanitizeBranchName('main\0'),
      ValidationError
    );
  });

  await t.test('trims whitespace', () => {
    const result = sanitizeBranchName('  main  ');
    assert.equal(result, 'main');
  });

  await t.test('rejects non-string input', () => {
    assert.throws(() => sanitizeBranchName(123), ValidationError);
    assert.throws(() => sanitizeBranchName(null), ValidationError);
  });
});

// =============================================================================
// validateTemplateName Function
// =============================================================================

test('validateTemplateName Function', async (t) => {
  await t.test('accepts valid template names', () => {
    const validNames = [
      'react',
      'vue',
      'react-vite',
      'next_js',
      'template123'
    ];

    for (const name of validNames) {
      const result = validateTemplateName(name);
      assert.ok(result, `Should accept: ${name}`);
    }
  });

  await t.test('rejects injection attempts', () => {
    assert.throws(
      () => validateTemplateName('react; rm -rf /'),
      ValidationError
    );
  });

  await t.test('rejects path traversal', () => {
    assert.throws(
      () => validateTemplateName('../../../malicious'),
      ValidationError
    );
  });

  await t.test('rejects empty or too long names', () => {
    assert.throws(() => validateTemplateName(''), ValidationError);
    assert.throws(
      () => validateTemplateName('a'.repeat(200)),
      ValidationError
    );
  });

  await t.test('rejects non-string input', () => {
    assert.throws(() => validateTemplateName(123), ValidationError);
  });
});

// =============================================================================
// validateProjectDirectory Function
// =============================================================================

test('validateProjectDirectory Function', async (t) => {
  await t.test('accepts valid project directory names', () => {
    const validDirs = [
      'my-project',
      'test_project',
      'Project123',
      'simple'
    ];

    for (const dir of validDirs) {
      const result = validateProjectDirectory(dir);
      assert.ok(result, `Should accept: ${dir}`);
    }
  });

  await t.test('rejects path traversal', () => {
    assert.throws(
      () => validateProjectDirectory('../../../etc'),
      ValidationError
    );
  });

  await t.test('rejects absolute paths', () => {
    assert.throws(
      () => validateProjectDirectory('/etc/passwd'),
      ValidationError
    );
  });

  await t.test('rejects shell metacharacters', () => {
    assert.throws(
      () => validateProjectDirectory('project; rm -rf /'),
      ValidationError
    );
  });

  await t.test('rejects null bytes', () => {
    assert.throws(
      () => validateProjectDirectory('project\0'),
      ValidationError
    );
  });

  await t.test('rejects empty or whitespace-only', () => {
    assert.throws(() => validateProjectDirectory(''), ValidationError);
    assert.throws(() => validateProjectDirectory('   '), ValidationError);
  });

  await t.test('rejects non-string input', () => {
    assert.throws(() => validateProjectDirectory(123), ValidationError);
  });
});

// =============================================================================
// sanitizeErrorMessage Function
// =============================================================================

test('sanitizeErrorMessage Function', async (t) => {
  await t.test('removes sensitive paths from error', () => {
    const error = new Error('/home/user/.ssh/id_rsa not found');
    const sanitized = sanitizeErrorMessage(error);
    assert.ok(!sanitized.includes('/home/user/.ssh'));
  });

  await t.test('removes environment variable values', () => {
    const error = new Error('Failed at HOME=/home/user');
    const sanitized = sanitizeErrorMessage(error);
    // Should not leak full path
    assert.ok(!sanitized.includes('/home/user'));
  });

  await t.test('handles non-Error input gracefully', () => {
    const sanitized = sanitizeErrorMessage('string error');
    assert.ok(typeof sanitized === 'string');
  });

  await t.test('preserves useful error information', () => {
    const error = new Error('File not found');
    const sanitized = sanitizeErrorMessage(error);
    assert.ok(sanitized.includes('not found'));
  });
});

// =============================================================================
// validateIdeParameter Function
// Note: 'windsurf' is an allowed IDE, 'none' is not
// =============================================================================

test('validateIdeParameter Function', async (t) => {
  await t.test('accepts valid IDE values', () => {
    const validIdes = ['vscode', 'cursor', 'kiro', 'windsurf'];

    for (const ide of validIdes) {
      const result = validateIdeParameter(ide);
      assert.equal(result, ide);
    }
  });

  await t.test('is case-insensitive', () => {
    assert.equal(validateIdeParameter('VSCode'), 'vscode');
    assert.equal(validateIdeParameter('CURSOR'), 'cursor');
    assert.equal(validateIdeParameter('Kiro'), 'kiro');
  });

  await t.test('returns null for null/undefined', () => {
    assert.equal(validateIdeParameter(null), null);
    assert.equal(validateIdeParameter(undefined), null);
  });

  await t.test('returns null for empty string', () => {
    assert.equal(validateIdeParameter(''), null);
    assert.equal(validateIdeParameter('  '), null);
  });

  await t.test('rejects invalid IDE values', () => {
    assert.throws(
      () => validateIdeParameter('vim'),
      ValidationError
    );
    assert.throws(
      () => validateIdeParameter('none'),
      ValidationError
    );
  });

  await t.test('rejects non-string input', () => {
    assert.throws(() => validateIdeParameter(123), ValidationError);
  });

  await t.test('rejects null byte injection', () => {
    assert.throws(
      () => validateIdeParameter('vscode\0'),
      ValidationError
    );
  });
});

// =============================================================================
// validateAuthoringMode Function
// Note: 'composable' is the alternative to 'wysiwyg', not 'pristine'
// Returns 'wysiwyg' for null/undefined/empty
// =============================================================================

test('validateAuthoringMode Function', async (t) => {
  await t.test('accepts valid authoring modes', () => {
    const validModes = ['wysiwyg', 'composable'];

    for (const mode of validModes) {
      const result = validateAuthoringMode(mode);
      assert.equal(result, mode);
    }
  });

  await t.test('returns default for null/undefined', () => {
    assert.equal(validateAuthoringMode(null), 'wysiwyg');
    assert.equal(validateAuthoringMode(undefined), 'wysiwyg');
  });

  await t.test('returns default for empty string', () => {
    assert.equal(validateAuthoringMode(''), 'wysiwyg');
    assert.equal(validateAuthoringMode('  '), 'wysiwyg');
  });

  await t.test('rejects invalid modes', () => {
    assert.throws(
      () => validateAuthoringMode('invalid'),
      ValidationError
    );
    assert.throws(
      () => validateAuthoringMode('pristine'),
      ValidationError
    );
  });

  await t.test('rejects non-string input', () => {
    assert.throws(() => validateAuthoringMode(123), ValidationError);
  });
});

// =============================================================================
// validateAuthorAssetsDir Function
// Note: Returns '__scaffold__' for null/undefined
// =============================================================================

test('validateAuthorAssetsDir Function', async (t) => {
  await t.test('accepts valid directory names', () => {
    const validDirs = ['__scaffold__', '__template__', 'assets'];

    for (const dir of validDirs) {
      const result = validateAuthorAssetsDir(dir);
      assert.equal(result, dir);
    }
  });

  await t.test('returns default for null/undefined', () => {
    assert.equal(validateAuthorAssetsDir(null), '__scaffold__');
    assert.equal(validateAuthorAssetsDir(undefined), '__scaffold__');
  });

  await t.test('rejects path traversal', () => {
    assert.throws(
      () => validateAuthorAssetsDir('../etc'),
      ValidationError
    );
  });

  await t.test('rejects absolute paths', () => {
    assert.throws(
      () => validateAuthorAssetsDir('/etc'),
      ValidationError
    );
  });

  await t.test('rejects shell metacharacters', () => {
    assert.throws(
      () => validateAuthorAssetsDir('dir; rm -rf /'),
      ValidationError
    );
  });

  await t.test('rejects non-string input', () => {
    assert.throws(() => validateAuthorAssetsDir(123), ValidationError);
  });
});

// =============================================================================
// validateDimensionsMetadata Function
// Note: Dimensions must have type: 'single' or 'multi' and non-empty values array
// =============================================================================

test('validateDimensionsMetadata Function', async (t) => {
  await t.test('accepts valid dimensions object', () => {
    const validDimensions = {
      features: {
        type: 'multi',
        values: ['auth', 'database'],
        default: []
      },
      framework: {
        type: 'single',
        values: ['react', 'vue'],
        default: 'react'
      }
    };

    const result = validateDimensionsMetadata(validDimensions);
    assert.ok(result);
    assert.ok(result.features);
    assert.ok(result.framework);
    assert.deepEqual(result.features.values, ['auth', 'database']);
    assert.equal(result.framework.type, 'single');
  });

  await t.test('returns empty object for null/undefined', () => {
    assert.deepEqual(validateDimensionsMetadata(null), {});
    assert.deepEqual(validateDimensionsMetadata(undefined), {});
  });

  await t.test('rejects non-object input', () => {
    assert.throws(
      () => validateDimensionsMetadata('invalid'),
      ValidationError
    );
    assert.throws(
      () => validateDimensionsMetadata([]),
      ValidationError
    );
  });

  await t.test('rejects dimensions without type', () => {
    const invalidDimensions = {
      features: {
        values: ['auth', 'database'],
        default: []
      }
    };

    assert.throws(
      () => validateDimensionsMetadata(invalidDimensions),
      ValidationError
    );
  });

  await t.test('rejects dimensions with invalid values', () => {
    const maliciousDimensions = {
      features: {
        type: 'multi',
        values: ['auth; rm -rf /', 'database'],
        default: []
      }
    };

    assert.throws(
      () => validateDimensionsMetadata(maliciousDimensions),
      ValidationError
    );
  });

  await t.test('rejects dimensions with path traversal in values', () => {
    const maliciousDimensions = {
      features: {
        type: 'multi',
        values: ['../../../etc/passwd', 'database'],
        default: []
      }
    };

    assert.throws(
      () => validateDimensionsMetadata(maliciousDimensions),
      ValidationError
    );
  });

  await t.test('handles empty dimensions object', () => {
    const result = validateDimensionsMetadata({});
    assert.deepEqual(result, {});
  });

  await t.test('validates dimension name format', () => {
    const invalidName = {
      'Invalid Name': {
        type: 'single',
        values: ['a'],
        default: 'a'
      }
    };

    assert.throws(
      () => validateDimensionsMetadata(invalidName),
      ValidationError
    );
  });

  await t.test('validates requires field references', () => {
    const withRequires = {
      features: {
        type: 'multi',
        values: ['auth', 'database', 'api'],
        default: [],
        requires: {
          api: ['auth']
        }
      }
    };

    const result = validateDimensionsMetadata(withRequires);
    assert.deepEqual(result.features.requires, { api: ['auth'] });
  });

  await t.test('validates conflicts field', () => {
    const withConflicts = {
      features: {
        type: 'multi',
        values: ['sqlite', 'postgres'],
        default: [],
        conflicts: {
          sqlite: ['postgres']
        }
      }
    };

    const result = validateDimensionsMetadata(withConflicts);
    assert.deepEqual(result.features.conflicts, { sqlite: ['postgres'] });
  });
});

// =============================================================================
// validateLogFilePath Function
// =============================================================================

test('validateLogFilePath Function', async (t) => {
  await t.test('accepts valid log file paths', () => {
    const validPaths = [
      'app.log',
      'logs/app.log',
      './debug.log'
    ];

    for (const logPath of validPaths) {
      const result = validateLogFilePath(logPath);
      assert.ok(result, `Should accept: ${logPath}`);
    }
  });

  await t.test('rejects path traversal', () => {
    assert.throws(
      () => validateLogFilePath('../../../etc/passwd'),
      ValidationError
    );
  });

  await t.test('rejects absolute paths outside project', () => {
    assert.throws(
      () => validateLogFilePath('/var/log/app.log'),
      ValidationError
    );
  });

  await t.test('rejects null bytes', () => {
    assert.throws(
      () => validateLogFilePath('app\0.log'),
      ValidationError
    );
  });

  await t.test('rejects non-string input', () => {
    assert.throws(() => validateLogFilePath(123), ValidationError);
  });
});

// =============================================================================
// validateCacheTtl Function
// Note: Requires string input, returns null for null/undefined/empty
// =============================================================================

test('validateCacheTtl Function', async (t) => {
  await t.test('accepts valid TTL string values', () => {
    const validTtls = ['1', '24', '168', '720']; // 1 hour to 30 days

    for (const ttl of validTtls) {
      const result = validateCacheTtl(ttl);
      assert.equal(result, parseInt(ttl, 10));
    }
  });

  await t.test('returns null for null/undefined', () => {
    assert.equal(validateCacheTtl(null), null);
    assert.equal(validateCacheTtl(undefined), null);
  });

  await t.test('returns null for empty string', () => {
    assert.equal(validateCacheTtl(''), null);
    assert.equal(validateCacheTtl('  '), null);
  });

  await t.test('rejects out-of-range values', () => {
    assert.throws(() => validateCacheTtl('0'), ValidationError);
    assert.throws(() => validateCacheTtl('-1'), ValidationError);
    assert.throws(() => validateCacheTtl('721'), ValidationError);
  });

  await t.test('rejects non-numeric strings', () => {
    assert.throws(() => validateCacheTtl('abc'), ValidationError);
    assert.throws(() => validateCacheTtl('24abc'), ValidationError);
  });

  await t.test('rejects non-string input', () => {
    assert.throws(() => validateCacheTtl(24), ValidationError);
    assert.throws(() => validateCacheTtl({}), ValidationError);
  });

  await t.test('rejects null bytes', () => {
    assert.throws(
      () => validateCacheTtl('24\0'),
      ValidationError
    );
  });
});

// =============================================================================
// validateAllInputs Function - Comprehensive Tests
// =============================================================================

test('validateAllInputs Comprehensive Tests', async (t) => {
  await t.test('passes through safe boolean flags', () => {
    const inputs = {
      projectDirectory: 'test-project',
      cache: true,
      dryRun: false,
      inputPrompts: true,
      config: true,
      placeholders: { key: 'value' },
      selection: { feature: 'auth' }
    };

    const result = validateAllInputs(inputs);
    assert.equal(result.cache, true);
    assert.equal(result.dryRun, false);
    assert.equal(result.inputPrompts, true);
    assert.equal(result.config, true);
    assert.deepEqual(result.placeholders, { key: 'value' });
    assert.deepEqual(result.selection, { feature: 'auth' });
  });

  await t.test('validates template URLs with path-like patterns', () => {
    const inputs = {
      projectDirectory: 'test',
      template: './local/template'
    };

    const result = validateAllInputs(inputs);
    assert.equal(result.template, './local/template');
  });

  await t.test('rejects template URLs with null bytes', () => {
    const inputs = {
      projectDirectory: 'test',
      template: './template\0malicious'
    };

    assert.throws(
      () => validateAllInputs(inputs),
      ValidationError
    );
  });

  await t.test('rejects template URLs with shell metacharacters', () => {
    const maliciousTemplates = [
      './template; rm -rf /',
      './template && evil',
      './template | pipe',
      './template`whoami`',
      './template$(id)',
      './template${HOME}'
    ];

    for (const template of maliciousTemplates) {
      assert.throws(
        () => validateAllInputs({ projectDirectory: 'test', template }),
        ValidationError,
        `Should reject: ${template}`
      );
    }
  });

  await t.test('validates cacheTtl when provided as string', () => {
    const inputs = {
      projectDirectory: 'test',
      cacheTtl: '24'
    };

    const result = validateAllInputs(inputs);
    assert.equal(result.cacheTtl, 24);
  });

  await t.test('validates logFile when provided', () => {
    const inputs = {
      projectDirectory: 'test',
      logFile: 'debug.log'
    };

    const result = validateAllInputs(inputs);
    assert.ok(result.logFile);
  });

  await t.test('validates projectName separately from projectDirectory', () => {
    const inputs = {
      projectName: 'my-project',
      projectDirectory: 'my-project'
    };

    const result = validateAllInputs(inputs);
    assert.equal(result.projectName, 'my-project');
    assert.equal(result.projectDirectory, 'my-project');
  });

  await t.test('accumulates errors from multiple invalid fields', () => {
    const inputs = {
      projectDirectory: '../evil',
      template: 'template; rm -rf /',
      branch: 'main; rm -rf /',
      ide: 'invalid-ide'
    };

    try {
      validateAllInputs(inputs);
      assert.fail('Should have thrown');
    } catch (error) {
      assert.ok(error instanceof ValidationError);
      // Should have multiple error lines
      const errorLines = error.message.split('\n').filter(l => l.includes('-'));
      assert.ok(errorLines.length >= 2, `Expected multiple errors, got: ${error.message}`);
    }
  });
});

// =============================================================================
// ValidationError Class
// =============================================================================

test('ValidationError Class', async (t) => {
  await t.test('creates error with message and field', () => {
    const error = new ValidationError('Invalid input', 'fieldName');
    assert.equal(error.name, 'ValidationError');
    assert.equal(error.message, 'Invalid input');
    assert.equal(error.field, 'fieldName');
  });

  await t.test('creates error with message only (field defaults to null)', () => {
    const error = new ValidationError('Invalid input');
    assert.equal(error.message, 'Invalid input');
    assert.equal(error.field, null);
  });

  await t.test('is instance of Error', () => {
    const error = new ValidationError('test');
    assert.ok(error instanceof Error);
    assert.ok(error instanceof ValidationError);
  });

  await t.test('has stack trace', () => {
    const error = new ValidationError('test');
    assert.ok(error.stack);
    assert.ok(error.stack.includes('ValidationError'));
  });
});
