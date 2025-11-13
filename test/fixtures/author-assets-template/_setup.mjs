export default async function setup({ tools }) {
  await tools.templates.copy('snippets', 'snippets');
}
