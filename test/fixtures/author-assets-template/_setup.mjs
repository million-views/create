export default async function setup({ tools }) {
  await tools.files.copyTemplateDir('__scaffold__/snippets', 'snippets');
}
