export default async function setup(ctx, tools) {
  tools.logger.info(`Configuring ${ctx.projectName}`, { ide: ctx.ide ?? 'none' });

  await tools.placeholders.replaceAll(
    { PROJECT_NAME: ctx.projectName },
    ['README.md', 'package.json', 'index.js']
  );

  if (ctx.ide) {
    await tools.ide.applyPreset(ctx.ide);
  }
}
