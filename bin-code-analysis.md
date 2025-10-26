# Bin Folder Code Duplication Analysis

## Executive Summary

After analyzing all 9 modules in the `bin/` folder, I found **significant code duplication** with several near-identical functions that can be shared. The duplications fall into clear categories with identical or nearly identical implementations.

## Major Code Duplications Found

### 1. **Command Execution Pattern** (CRITICAL DUPLICATION)

**Files with identical `execCommand` implementations:**
- `bin/preflightChecks.mjs` (lines 402-440)
- `bin/index.mjs` (lines 610-648)

**Identical Code:**
```javascript
function execCommand(command, args, options = {}) {
  const { timeout = 10000 } = options; // Only difference: default timeout values
  
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'] // Minor difference: index.mjs uses ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timeoutId;

    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    }

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });

    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (code === 0) {
        resolve(stdout);
      } else {
        const error = new Error(stderr || stdout || `Command failed with exit code ${code}`);
        reject(error);
      }
    });
  });
}
```

**Lines of Duplication:** ~40 lines × 2 files = **80 lines**

### 2. **Directory Existence Validation Pattern** (MAJOR DUPLICATION)

**Files with nearly identical directory validation:**
- `bin/dryRunEngine.mjs` (4 instances)
- `bin/templateDiscovery.mjs` (1 instance)
- `bin/preflightChecks.mjs` (2 instances)
- `bin/index.mjs` (1 instance)

**Near-Identical Code Pattern:**
```javascript
// Pattern repeated 8 times across files:
try {
  const stats = await fs.stat(somePath);
  if (!stats.isDirectory()) {
    throw new Error(`[Path] is not a directory: ${somePath}`);
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    throw new Error(`[Path] not found: ${somePath}`);
  }
  throw error;
}
```

**Lines of Duplication:** ~8 lines × 8 instances = **64 lines**

### 3. **Directory Creation with Error Handling** (MAJOR DUPLICATION)

**Files with identical directory creation patterns:**
- `bin/cacheManager.mjs` (2 instances)
- `bin/logger.mjs` (1 instance)
- `bin/index.mjs` (2 instances)

**Identical Code Pattern:**
```javascript
// Pattern repeated 5 times:
try {
  await fs.mkdir(dirPath, { recursive: true, mode: 0o755 }); // mode sometimes omitted
} catch (error) {
  if (error.code !== 'EEXIST') {
    throw new Error(`Failed to create [type] directory: ${error.message}`);
  }
}
```

**Lines of Duplication:** ~6 lines × 5 instances = **30 lines**

### 4. **File Cleanup Pattern** (MAJOR DUPLICATION)

**Files with identical cleanup patterns:**
- `bin/cacheManager.mjs` (2 instances)
- `bin/index.mjs` (4 instances)

**Identical Code Pattern:**
```javascript
// Pattern repeated 6 times:
try {
  await fs.rm(somePath, { recursive: true, force: true });
} catch (error) {
  // Ignore cleanup errors
}
```

**Lines of Duplication:** ~5 lines × 6 instances = **30 lines**

### 5. **ValidationError Handling Pattern** (MODERATE DUPLICATION)

**Files with identical validation error handling:**
- `bin/argumentParser.mjs` (8 instances)

**Identical Code Pattern:**
```javascript
// Pattern repeated 8 times in argumentParser.mjs:
try {
  validateSomeFunction(args.someField);
} catch (error) {
  if (error instanceof ValidationError) {
    errors.push(error.message);
  } else {
    errors.push('[Field] validation failed');
  }
}
```

**Lines of Duplication:** ~7 lines × 8 instances = **56 lines**

### 6. **JSON File Reading Pattern** (MODERATE DUPLICATION)

**Files with similar JSON file reading:**
- `bin/cacheManager.mjs` (1 instance)
- `bin/templateDiscovery.mjs` (2 instances)

**Similar Code Pattern:**
```javascript
// Pattern repeated 3 times:
try {
  const rawData = await fs.readFile(filePath, 'utf8');
  return JSON.parse(rawData);
} catch (error) {
  if (error.code === 'ENOENT') {
    return null; // or throw specific error
  }
  throw new Error(`Failed to read [file type]: ${error.message}`);
}
```

**Lines of Duplication:** ~7 lines × 3 instances = **21 lines**

## Summary of Duplications

| Pattern | Files Affected | Instances | Lines Duplicated |
|---------|---------------|-----------|------------------|
| Command Execution | 2 files | 2 | 80 lines |
| Directory Validation | 4 files | 8 | 64 lines |
| Directory Creation | 3 files | 5 | 30 lines |
| File Cleanup | 2 files | 6 | 30 lines |
| ValidationError Handling | 1 file | 8 | 56 lines |
| JSON File Reading | 2 files | 3 | 21 lines |
| **TOTAL** | **6 files** | **32 instances** | **~281 lines** |

## Recommendations for Shared Utilities

### 1. **Create `bin/utils/commandUtils.mjs`** (HIGH PRIORITY)
```javascript
export async function execCommand(command, args, options = {}) {
  // Unified command execution with configurable stdio and timeout
}
```

### 2. **Create `bin/utils/fsUtils.mjs`** (HIGH PRIORITY)
```javascript
export async function ensureDirectory(dirPath, mode = 0o755) {
  // Unified directory creation with error handling
}

export async function validateDirectoryExists(dirPath, errorMessage) {
  // Unified directory existence validation
}

export async function safeCleanup(path) {
  // Unified cleanup with error suppression
}

export async function readJsonFile(filePath, defaultValue = null) {
  // Unified JSON file reading with error handling
}
```

### 3. **Create `bin/utils/validationUtils.mjs`** (MEDIUM PRIORITY)
```javascript
export function handleValidationError(validationFn, errorArray, fallbackMessage) {
  // Unified validation error handling pattern
}
```

## Files That Would Benefit Most from Refactoring

### **High Impact Files:**
1. **`bin/index.mjs`** - 6 instances of duplicate patterns (command exec, cleanup, directory ops)
2. **`bin/dryRunEngine.mjs`** - 4 instances of directory validation
3. **`bin/cacheManager.mjs`** - 4 instances of file ops and cleanup
4. **`bin/argumentParser.mjs`** - 8 instances of validation error handling

### **Medium Impact Files:**
5. **`bin/preflightChecks.mjs`** - 3 instances (command exec, directory validation)
6. **`bin/templateDiscovery.mjs`** - 3 instances (directory validation, JSON reading)

## Estimated Impact of Refactoring

- **Code Reduction**: ~281 lines of duplicate code eliminated
- **Maintenance**: Single source of truth for common operations
- **Consistency**: Uniform error handling and behavior across modules
- **Testing**: Shared utilities can be tested once instead of in each module
- **Bug Fixes**: Fixes to shared utilities benefit all modules

## Implementation Priority

1. **Phase 1** (HIGH): Create `commandUtils.mjs` and `fsUtils.mjs` - eliminates 204 lines
2. **Phase 2** (MEDIUM): Create `validationUtils.mjs` - eliminates 56 lines  
3. **Phase 3** (LOW): Refactor remaining minor duplications - eliminates 21 lines

## Notes

- All identified duplications are **functional equivalents** that can be safely abstracted
- The shared utilities would maintain the same error handling behavior
- No breaking changes to existing module interfaces
- Shared utilities follow the same zero-dependency architecture
- All duplications are in **implementation details**, not public APIs