import path from 'path';
import fs from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processComponent(scriptPath, viewModel, key, index = null, partialData) {
    const resolvedPath = pathToFileURL(path.resolve(scriptPath)).href;
    const module = await import(resolvedPath);

    if (typeof module.getHtml === 'function') {
        const html = await module.getHtml(viewModel,partialData);
        if (index !== null) {
            viewModel.displayRules[key][index] = html;
        } else {
            viewModel.displayRules[key] = html;
        }
    } else {
        console.warn(`The ${scriptPath} module not export 'getHtml' function.`);
        const fallback = '<!-- Error: needed getHtml() -->';
        if (index !== null) {
            viewModel.displayRules[key][index] = fallback;
        } else {
            viewModel.displayRules[key] = fallback;
        }
    }

    // CSS fájlok gyűjtése
    const relativePath = path.dirname(
        path.relative(path.join(__dirname, '..'), fileURLToPath(resolvedPath))
    );
    const dirContent = fs.readdirSync(relativePath, { withFileTypes: true });

    for (const item of dirContent) {
        if (item.isFile() && path.extname(item.name) === '.css') {
            const cssPath = path.join('css', relativePath, item.name).replace(/\\/g, '/');
            viewModel.displayRules.headCssLinks.push(cssPath);
        }
    }
}

export async function resolveDynamicContent(viewModel) {
    for (const [key, value] of Object.entries(viewModel.displayRules)) {
        if (key.endsWith('_content')) {
            const regex = /(c\d+)(_content)/;
            const found = key.match(regex);
            const partialData = `${found[1]}_ejsData`

            if (Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                    if (typeof value[i] === 'string' && value[i].endsWith('.js')) {
                        await processComponent(value[i], viewModel, key, i, partialData);
                    }
                }
            } else if (typeof value === 'string' && value.endsWith('.js')) {
                await processComponent(value, viewModel, key, partialData);
            }
        }
    }
}