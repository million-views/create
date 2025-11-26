# Util Domain

The util domain provides file, shell, and text utilities used throughout the application.

## Overview

This domain exports:

- **File** - File system utilities
- **Shell** - Shell command execution utilities
- **Text** - Text processing utilities

## Usage

```typescript
import { util } from '../index.mts';

// File utilities
const content = await util.File.read('/path/to/file.txt');
await util.File.write('/path/to/file.txt', content);
const exists = await util.File.exists('/path/to/file.txt');

// Shell utilities
const result = await util.Shell.exec('git', ['status']);
const gitVersion = await util.Shell.which('git');

// Text utilities
const slug = util.Text.slugify('My Project Name'); // 'my-project-name'
const truncated = util.Text.truncate(longText, 100);
```

## Module Structure

```text
util/
├── index.mts    # Domain facade
├── file.mjs     # File utilities
├── shell.mjs    # Shell command utilities
└── text.mjs     # Text processing utilities
```

## API Reference

### File

File system utilities.

```typescript
class File {
  static async read(path: string): Promise<string>;
  static async write(path: string, content: string): Promise<void>;
  static async exists(path: string): Promise<boolean>;
  static async copy(src: string, dest: string): Promise<void>;
  static async remove(path: string): Promise<void>;
  static async mkdir(path: string): Promise<void>;
  static async readdir(path: string): Promise<string[]>;
  static async stat(path: string): Promise<Stats>;
  static async isDirectory(path: string): Promise<boolean>;
  static async isFile(path: string): Promise<boolean>;
}
```

### Shell

Shell command execution utilities.

```typescript
class Shell {
  static async exec(
    command: string, 
    args: string[], 
    options?: ExecOptions
  ): Promise<ExecResult>;
  
  static async which(command: string): Promise<string | null>;
  
  static async spawn(
    command: string, 
    args: string[], 
    options?: SpawnOptions
  ): Promise<SpawnResult>;
}

interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

### Text

Text processing utilities.

```typescript
class Text {
  static slugify(text: string): string;
  static truncate(text: string, maxLength: number): string;
  static capitalize(text: string): string;
  static camelCase(text: string): string;
  static kebabCase(text: string): string;
  static pascalCase(text: string): string;
  static snakeCase(text: string): string;
}
```

## Best Practices

1. **Use File utilities** instead of direct `fs` imports for consistency
2. **Always handle errors** from shell commands
3. **Use Text utilities** for consistent string transformations
4. **Prefer async methods** over sync alternatives

## Error Handling

All utilities throw descriptive errors:

```typescript
try {
  await util.File.read('/nonexistent/file.txt');
} catch (error) {
  // Error: ENOENT: no such file or directory
}

try {
  await util.Shell.exec('nonexistent-command', []);
} catch (error) {
  // Error: Command not found: nonexistent-command
}
```
