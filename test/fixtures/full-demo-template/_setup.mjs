export default async function setup({ ctx, tools }) {
  tools.logger.info(`Preparing ${ctx.projectName}`);

  await tools.placeholders.replaceAll(
    { PROJECT_NAME: ctx.projectName },
    ['README.md', 'package.json', 'index.js']
  );

  await tools.files.ensureDirs(['config', 'docs']);
  await tools.files.move('seed/config.base.json', 'config/app.json', { overwrite: true });
  await tools.files.copy('README.md', 'docs/overview.md', { overwrite: true });
  await tools.files.remove('seed');

  await tools.json.set('package.json', 'scripts.lint', 'echo "lint placeholder"');
  await tools.text.appendLines({
    file: 'docs/overview.md',
    lines: [
      '## Project Notes',
      `Generated on: ${new Date().toISOString().split('T')[0]}`
    ]
  });

  await tools.options.when('docs', async () => {
    await tools.templates.renderFile(
      'templates/docs.md.tpl',
      'docs/index.md',
      { PROJECT_NAME: ctx.projectName }
    );
    await tools.text.ensureBlock({
      file: 'docs/index.md',
      marker: `# ${ctx.projectName} Documentation`,
      block: ['## Contents', '- Overview', '- Next Steps']
    });
  });

  if (ctx.ide) {
    await tools.ide.applyPreset(ctx.ide);
  }
}
