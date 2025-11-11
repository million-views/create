#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateOptionsParameter,
  validateAllInputs,
  ValidationError
} from '../../lib/shared/security.mjs';

function expectValidationError(fn, { messageIncludes, label }) {
  assert.throws(
    fn,
    (error) => {
      assert.ok(error instanceof ValidationError, `Expected ValidationError for ${label}, received ${error.constructor.name}`);
      if (messageIncludes) {
        const matches = typeof messageIncludes === 'string'
          ? error.message.includes(messageIncludes)
          : messageIncludes.test(error.message);
        assert.ok(matches, `Expected error message for ${label} to include ${messageIncludes}, received: ${error.message}`);
      }
      return true;
    },
    `Expected ValidationError for ${label}`
  );
}

test('Options parameter rejects path traversal attempts', () => {
  const attempts = [
    '../auth',
    '../../database',
    'auth/../malicious',
    './auth',
    '/auth',
    '\\auth',
    'auth\\..\\malicious',
    'auth,../malicious,database',
    'auth,../../etc/passwd,database'
  ];

  for (const attempt of attempts) {
    expectValidationError(() => validateOptionsParameter(attempt), {
      messageIncludes: 'Invalid option name',
      label: `path traversal attempt ${attempt}`
    });
  }
});

test('Options parameter rejects injection attempts', () => {
  const attempts = [
    'auth; rm -rf /',
    'auth && malicious',
    'auth | evil',
    'auth`malicious`',
    'auth$(evil)',
    'auth${evil}',
    'auth\nmalicious',
    'auth\rmalicious',
    'auth\tmalicious',
    'auth,database; rm -rf /,testing',
    'auth,$(malicious),database'
  ];

  for (const attempt of attempts) {
    expectValidationError(() => validateOptionsParameter(attempt), {
      messageIncludes: 'Invalid option name',
      label: `injection attempt ${attempt}`
    });
  }
});

test('Options parameter rejects null byte injection', () => {
  const attempts = ['auth\0', '\0auth', 'au\0th', 'auth\0malicious', 'auth,data\0base,testing', 'auth,\0malicious,database'];

  for (const attempt of attempts) {
    expectValidationError(() => validateOptionsParameter(attempt), {
      messageIncludes: 'null bytes',
      label: `null byte attempt ${JSON.stringify(attempt)}`
    });
  }
});

test('Options parameter rejects malicious combinations', () => {
  const attempts = [
    'auth,@malicious,database',
    'auth,feature@evil.com,database',
    'auth,http://evil.com,database',
    'auth,<script>alert("xss")</script>,database',
    'auth,../../etc/passwd,database',
    'auth,${HOME},database',
    'auth,`whoami`,database',
    'auth,$(id),database'
  ];

  for (const attempt of attempts) {
    expectValidationError(() => validateOptionsParameter(attempt), {
      messageIncludes: 'Invalid option name',
      label: `malicious combination ${attempt}`
    });
  }
});

test('Options parameter guards against resource exhaustion', () => {
  const longOption = 'a'.repeat(1000);
  expectValidationError(() => validateOptionsParameter(longOption), {
    label: 'overly long option'
  });

  const manyOptions = Array(100).fill('auth').join(',');
  try {
    const result = validateOptionsParameter(manyOptions);
    assert.ok(Array.isArray(result), 'Expected array result for many options');
  } catch (error) {
    assert.ok(error instanceof ValidationError, `Expected ValidationError or success for many options, received ${error.constructor.name}`);
  }
});

test('validateAllInputs processes safe payloads correctly', () => {
  const inputs = {
    projectDirectory: 'test-project',
    template: 'react',
    repo: 'user/repo',
    branch: 'main',
    ide: 'kiro',
    options: 'auth,database,testing'
  };

  const result = validateAllInputs(inputs);
  assert.equal(result.ide, 'kiro');
  assert.ok(Array.isArray(result.options), 'Options should be array');
  assert.equal(result.options.length, 3, 'Expected three options');
  assert.deepEqual(new Set(result.options), new Set(['auth', 'database', 'testing']));
});

test('validateAllInputs accumulates multiple validation failures', () => {
  const maliciousInputs = {
    projectDirectory: '../evil',
    template: '../../malicious',
    repo: 'javascript:alert("xss")', // eslint-disable-line no-script-url
    branch: 'main; rm -rf /',
    ide: 'evil-ide',
    options: 'auth,../malicious,database'
  };

  expectValidationError(() => validateAllInputs(maliciousInputs), {
    messageIncludes: 'Input validation failed',
    label: 'multiple malicious inputs'
  });

  try {
    validateAllInputs(maliciousInputs);
  } catch (error) {
    const matches = error.message.match(/- /g) || [];
    assert.ok(matches.length >= 3, `Expected multiple validation errors, received ${matches.length}: ${error.message}`);
  }
});

test('validateAllInputs ignores undefined optional parameters', () => {
  const inputs = {
    projectDirectory: 'test-project',
    template: 'react'
  };

  const result = validateAllInputs(inputs);
  assert.ok(!('ide' in result), 'IDE should be omitted when undefined');
  assert.ok(!('features' in result), 'Features should be omitted when undefined');
});

test('Validation functions do not expose environment variables', () => {
  const attempts = ['$HOME', '${HOME}', '$PATH', '${PATH}', '$USER', '${USER}', '%USERPROFILE%', '%PATH%'];

  for (const attempt of attempts) {
    try {
      const optionsResult = validateOptionsParameter(attempt);
      for (const option of optionsResult) {
        assert.ok(!option.includes('/') && !option.includes('\\'), `Options should not reveal env vars for ${attempt}`);
      }
    } catch (error) {
      assert.ok(error instanceof ValidationError, `Unexpected error type for options env var test: ${error.constructor.name}`);
    }
  }
});

test('Validation functions do not leak system paths or IP addresses', () => {
  const pathAttempts = ['/etc/passwd', '/etc/shadow', 'C:\\Windows\\System32', '/proc/version', '/sys/class/net'];
  const ipAttempts = ['127.0.0.1', '192.168.1.1'];

  for (const attempt of pathAttempts) {
    expectValidationError(() => validateOptionsParameter(attempt), {
      label: `Options system path ${attempt}`
    });
  }

  for (const attempt of ipAttempts) {
    expectValidationError(() => validateOptionsParameter(attempt), {
      label: `Options IP address ${attempt}`
    });
  }
});

test('Input sanitization withstands Unicode and encoded attacks', () => {
  const attempts = [
    'kiro\u0000malicious',
    'ki\u000Aro',
    'ki\u000Dro',
    'ki\u0009ro',
    'kiro\u001Bmalicious',
    'auth\u002E\u002E\u002Fmalicious',
    'auth\u0026\u0026rm'
  ];

  for (const attempt of attempts) {
    expectValidationError(() => validateOptionsParameter(attempt), {
      label: `Options Unicode attack ${JSON.stringify(attempt)}`
    });
  }
});
