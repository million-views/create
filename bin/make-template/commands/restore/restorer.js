import fs from 'fs';
import path from 'path';

export class Restorer {
  constructor(options) {
    this.options = options;
  }

  restore() {
    console.log(`Restoring template: ${this.options.projectPath}`);

    const undoLogPath = path.join(this.options.projectPath, '.template-undo.json');

    // Check if undo log exists
    if (!fs.existsSync(undoLogPath)) {
      console.error(`❌ .template-undo.json not found in ${this.options.projectPath}`);
      console.error("Cannot restore without undo log. Make sure you're in the right directory.");
      process.exit(1);
    }

    // Read undo log
    let undoLog;
    try {
      undoLog = JSON.parse(fs.readFileSync(undoLogPath, 'utf8'));
    } catch (error) {
      console.error('❌ Failed to read undo log:', error.message);
      process.exit(1);
    }

    if (this.options.dryRun) {
      console.log('DRY RUN MODE - No changes will be made');
      console.log('DRY RUN: Would restore template to project');
      console.log('Files that would be restored:');
      undoLog.fileOperations.forEach(op => {
        console.log(`  • ${op.path}`);
      });
      console.log('No changes were made');
      return;
    }

    // Perform restoration
    this.performRestoration(undoLog);

    // Clean up undo log unless --keep-undo is specified
    if (!this.options.keepUndo) {
      fs.unlinkSync(undoLogPath);
      console.log('✓ Cleanup: Removed .template-undo.json');
    }

    console.log('✓ Template restored to project successfully');
  }

  performRestoration(undoLog) {
    const operations = undoLog.fileOperations || [];

    // Filter operations if specific files requested
    let operationsToProcess = operations;
    if (this.options.files && this.options.files.length > 0) {
      operationsToProcess = operations.filter(op => this.options.files.includes(op.path));
      if (operationsToProcess.length === 0) {
        console.log('⚠️  No matching files found in undo log for restoration');
        return;
      }
    }

    for (const operation of operationsToProcess) {
      this.restoreFile(operation);
    }
  }

  restoreFile(operation) {
    const filePath = path.join(this.options.projectPath, operation.path);

    try {
      if (operation.type === 'modified' && operation.originalContent) {
        // Restore original content
        fs.writeFileSync(filePath, operation.originalContent);
        console.log(`✓ Restored ${operation.path}`);
      } else if (operation.type === 'created') {
        // Remove created files
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✓ Removed ${operation.path}`);
        }
      } else if (operation.type === 'deleted') {
        // Restore deleted files
        if (operation.originalContent) {
          fs.writeFileSync(filePath, operation.originalContent);
          console.log(`✓ Recreated ${operation.path}`);
        }
      }
    } catch (error) {
      console.error(`⚠️  Failed to restore ${operation.path}: ${error.message}`);
    }
  }
}
