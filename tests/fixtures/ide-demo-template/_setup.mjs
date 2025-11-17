export default async function setup({ ctx, tools }) {
  const ide = ctx.constants?.ide ?? 'none';
  tools.logger.info(`Configuring ${ctx.projectName}`, { ide });

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
  await tools.json.addToArray('package.json', 'keywords', ide);

  if (ide !== 'none') {
    await tools.templates.copy('.vscode', '.vscode');
  }
}
