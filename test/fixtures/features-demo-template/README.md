# Features Demo Project

This project demonstrates feature-based customizations using the @m5nv/create-scaffold CLI tool.

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
# Create project with authentication
m5nv-create my-project --from-template features-demo --features auth

# Create project with multiple features
m5nv-create my-project --from-template features-demo --features auth,database,api

# Create project with all features
m5nv-create my-project --from-template features-demo --features auth,database,api,testing,logging,config
```

## Files Created

The setup script will create feature-specific files and directories based on your selection:

- `src/auth/` - Authentication modules (if auth feature selected)
- `src/database/` - Database utilities (if database feature selected)
- `src/api/` - API endpoints (if api feature selected)
- `tests/` - Test files (if testing feature selected)
- `src/logging/` - Logging utilities (if logging feature selected)
- `config/` - Configuration files (if config feature selected)