import ejs from 'ejs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getHtml(viewModel, partialData) {
    const templatePath = join(__dirname, 'template.ejs');
    const template = await readFile(templatePath, 'utf-8');
    return ejs.render(template, { /*viewModel: viewModel,*/ partialData: viewModel.displayRules[partialData]});
}