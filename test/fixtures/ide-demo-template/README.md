# IDE Demo Project

This project demonstrates IDE-specific customizations using the @m5nv/create CLI tool.

## IDE Configuration

This template automatically configures itself for your preferred IDE:

- **Kiro**: Creates `.kiro/` directory with Kiro-specific settings
- **VSCode**: Creates `.vscode/` directory with VSCode settings and extensions
- **Cursor**: Creates `.cursor/` directory with Cursor-specific configuration  
- **Windsurf**: Creates `.windsurf/` directory with Windsurf settings

## Usage

```bash
# Create project for Kiro
m5nv-create my-project --template ide-demo --ide kiro

# Create project for VSCode
m5nv-create my-project --template ide-demo --ide vscode

# Create project for Cursor
m5nv-create my-project --template ide-demo --ide cursor

# Create project for Windsurf
m5nv-create my-project --template ide-demo --ide windsurf
```

## Files Created

The setup script will create IDE-specific configuration files based on your selection.