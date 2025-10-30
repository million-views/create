export default async function setup({ ctx, tools }) {
  await tools.placeholders.applyInputs(['README.md']);
  await tools.files.write('placeholder-report.json', JSON.stringify(tools.inputs.all(), null, 2), { overwrite: true });
}
