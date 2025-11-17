export default async function setup({ ctx, tools }) {
  await tools.placeholders.replaceAll(
    { PROJECT_NAME: ctx.projectName },
    ['README.md', 'package.json', 'index.js']
  );

  await tools.json.set('package.json', 'scripts.dev', 'node index.js');
  await tools.json.set('package.json', 'm5nv.features', []);

  const selected = [];

  await tools.options.when('api', async () => {
    selected.push('api');
    await tools.files.ensureDirs(['src/api']);
    await tools.templates.renderFile(
      'templates/api-handler.js.tpl',
      'src/api/index.js',
      { PROJECT_NAME: ctx.projectName }
    );
    await tools.json.addToArray('package.json', 'm5nv.features', 'api', { unique: true });
  });

  await tools.options.when('auth', async () => {
    selected.push('auth');
    await tools.files.ensureDirs(['src/auth']);
    await tools.templates.renderFile(
      'templates/auth-service.js.tpl',
      'src/auth/service.js',
      { PROJECT_NAME: ctx.projectName }
    );
    await tools.json.addToArray('package.json', 'm5nv.features', 'auth', { unique: true });
  });

  await tools.options.when('testing', async () => {
    selected.push('testing');
    await tools.files.ensureDirs(['tests']);
    await tools.templates.renderFile(
      'templates/test.spec.js.tpl',
      'tests/sanity.spec.js',
      { PROJECT_NAME: ctx.projectName }
    );
    await tools.json.addToArray('package.json', 'm5nv.features', 'testing', { unique: true });
  });

  if (selected.length) {
    await tools.text.appendLines({
      file: 'README.md',
      lines: [
        '## Enabled Features',
        ...selected.map(feature => `- ${feature}`)
      ]
    });
  }
}
