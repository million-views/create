# Test Fixtures

This directory contains test fixtures for the @m5nv/create-scaffold CLI tool, including example templates that demonstrate the new Environment_Object interface for setup scripts.

## Template Structure

Each fixture template includes:
- Basic project files (package.json, README.md, etc.)
- `_setup.mjs` file demonstrating Environment_Object usage
- IDE-specific customizations
- Feature-based conditional logic

## Available Fixtures

### ide-demo-template
Demonstrates IDE-specific customizations for all supported IDEs (Kiro, VSCode, Cursor, Windsurf).

### features-demo-template  
Shows feature-based conditional logic for common project features (auth, database, testing, api).

### full-demo-template
Combines both IDE and features customization in a comprehensive example.

## Usage in Tests

These fixtures are used by the test suite to verify:
- Environment_Object parameter passing
- IDE-specific setup script behavior
- Feature-based template customization
- Error handling for malformed setup scripts