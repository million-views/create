# Full Demo Project

This project demonstrates comprehensive IDE and feature-based customizations using the @m5nv/create CLI tool.

## IDE Support

This template automatically configures itself for your preferred IDE:

- **Kiro**: Creates `.kiro/` directory with Kiro-specific settings
- **VSCode**: Creates `.vscode/` directory with VSCode settings and extensions
- **Cursor**: Creates `.cursor/` directory with Cursor-specific configuration  
- **Windsurf**: Creates `.windsurf/` directory with Windsurf settings

## Available Features

This template supports the following optional features:

- **auth**: Authentication system with login/logout functionality
- **database**: Database integration with connection utilities
- **api**: REST API endpoints and middleware
- **testing**: Test framework setup with example tests
- **logging**: Structured logging with different levels
- **config**: Configuration management system

## Usage

```bash
# Create project for Kiro with authentication
m5nv-create my-project --template full-demo --ide kiro --features auth

# Create project for VSCode with multiple features
m5nv-create my-project --template full-demo --ide vscode --features auth,database,api

# Create comprehensive project with all features
m5nv-create my-project --template full-demo --ide cursor --features auth,database,api,testing,logging,config
```

## Smart Integration

The setup script intelligently combines IDE and feature configurations:

- IDE-specific settings are optimized for selected features
- Feature modules include IDE-specific optimizations
- Configuration files are tailored to both IDE and feature selections
- Testing setup is customized for the target IDE environment

## Files Created

The setup script creates both IDE-specific and feature-specific files based on your selections.