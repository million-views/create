export function captureOutput(fn) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));

  try {
    fn();
    return { logs, errors };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

export async function captureOutputAsync(fn) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));

  try {
    await fn();
    return { logs, errors };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

export function mockExit(fn) {
  let exitCode = null;
  const originalExit = process.exit;

  process.exit = (code) => {
    exitCode = code;
    throw new Error('EXIT_CALLED');
  };

  try {
    fn();
  } catch (err) {
    if (err.message !== 'EXIT_CALLED') throw err;
  } finally {
    process.exit = originalExit;
  }

  return exitCode;
}

export async function mockExitAsync(fn) {
  let exitCode = null;
  const originalExit = process.exit;

  process.exit = (code) => {
    exitCode = code;
    throw new Error('EXIT_CALLED');
  };

  try {
    await fn();
  } catch (err) {
    if (err.message !== 'EXIT_CALLED') throw err;
  } finally {
    process.exit = originalExit;
  }

  return exitCode;
}
