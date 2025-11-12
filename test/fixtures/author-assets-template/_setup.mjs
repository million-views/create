export default async function setup({ tools }) {
  await tools.files.copyFromTemplate('__scaffold__/snippets', 'snippets');
}
