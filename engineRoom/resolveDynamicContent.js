import path from 'path';
import { pathToFileURL } from 'url';

export async function resolveDynamicContent(viewModel) {
    for (const [key, value] of Object.entries(viewModel.displayRules)) {
        if (
            key.endsWith('_content') &&
            Array.isArray(value) &&
            typeof value[0] === 'string' &&
            value[0].endsWith('.js')
        ) {
            const resolvedPath = pathToFileURL(path.resolve(value[0])).href;
            const module = await import(resolvedPath);
            const html = await module.getHtml(viewModel);

            if (typeof module.getHtml === 'function') {
                viewModel.displayRules[key] = html;
            } else {
                console.warn(`A(z) ${value[0]} the module not export 'getHtml' function.`);
                viewModel.displayRules[key] = '<!-- Error: needed getHtml() -->';
            }
        }
    }
}