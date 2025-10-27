export default async function setup({ ctx, tools }) {
  tools.logger.info(`Configuring ${ctx.projectName}`, { ide: ctx.ide ?? 'none' });

  await tools.placeholders.replaceAll(
    { PROJECT_NAME: ctx.projectName },
    ['README.md', 'package.json', 'index.js']
  );

  await tools.text.ensureBlock({
    file: 'README.md',
    marker: `# ${ctx.projectName}`,
    block: [
      '## Getting Started',
      '- npm install',
      '- npm run start'
    ]
  });

  await tools.json.set('package.json', 'description', `${ctx.projectName} scaffolded project`);
  await tools.json.addToArray('package.json', 'keywords', ctx.ide ?? 'ide');

  if (ctx.ide) {
    await tools.ide.applyPreset(ctx.ide);
  }
}
