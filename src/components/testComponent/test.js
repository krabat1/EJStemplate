import ejs from 'ejs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
/**
 * The ejs render method renders html content from the template.ejs file 
 * (using the data associated with the received ejsDataKey), which it returns.
 * @param {Object} viewModel 
 * @param {string} ejsDataKey 
 * @returns html data as string
 */
export async function getHtml(viewModel, ejsDataKey,index = null) {
    const templatePath = join(__dirname, 'template.ejs');
    const template = await readFile(templatePath, 'utf-8');
    return ejs.render(template, { partialData: viewModel.displayRules[ejsDataKey][index]});
}