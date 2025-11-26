import fs from 'fs';
import path from 'path';
import { File } from '@m5nv/create-scaffold/lib/util/file.mjs';
import { ContextualError, ErrorContext, ErrorSeverity, handleError } from '@m5nv/create-scaffold/lib/error/index.mts';

export class Restorer {
  constructor(options) {
    this.options = options;
  }

  async restore() {
    try {
      console.log(`Restoring template: ${this.options.projectPath}`);

      const undoLogPath = path.join(this.options.projectPath, '.template-undo.json');

      // Check if undo log exists
      if (!(await File.exists(undoLogPath))) {
        throw new ContextualError(
          `.template-undo.json not found in ${this.options.projectPath}`,
          {
            context: ErrorContext.USER_INPUT,
            severity: ErrorSeverity.HIGH,
            operation: 'restore',
            suggestions: [
              'Ensure you are in the correct project directory',
              'Check that a template conversion was performed previously',
              'Verify the .template-undo.json file was not manually deleted'
            ]
          }
        );
      }

      // Read undo log
      const undoLog = await File.readJsonFile(undoLogPath);

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
      await this.performRestoration(undoLog);

      // Clean up undo log unless --keep-undo is specified
      if (!this.options.keepUndo) {
        await File.remove(undoLogPath);
        console.log('✓ Cleanup: Removed .template-undo.json');
      }

      console.log('✓ Template restored to project successfully');
    } catch (error) {
      handleError(error, {
        context: ErrorContext.FILE_OPERATION,
        severity: ErrorSeverity.HIGH,
        operation: 'restore',
        suggestions: [
          'Check file permissions in the project directory',
          'Ensure the undo log is not corrupted',
          'Verify all files referenced in the undo log still exist'
        ]
      });
      process.exit(1);
    }
  }

  async performRestoration(undoLog) {
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
      await this.restoreFile(operation);
    }
  }

  async restoreFile(operation) {
    const filePath = path.join(this.options.projectPath, operation.path);

    try {
      if (operation.type === 'modified' && operation.originalContent) {
        // Restore original content
        fs.writeFileSync(filePath, operation.originalContent);
        console.log(`✓ Restored ${operation.path}`);
      } else if (operation.type === 'created') {
        // Remove created files
        if (await File.exists(filePath)) {
          await File.remove(filePath);
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
