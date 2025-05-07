import path from 'path';
import { pathToFileURL } from 'url';

export async function resolveDynamicContent(viewModel) {
    for (const [key, value] of Object.entries(viewModel.displayRules)) {
        if(key.endsWith('_content')){
            if(Array.isArray(value)){
                for( let i = 0; i < value.length; i++ ){
                    if(
                        typeof value[i] === 'string' &&
                        value[i].endsWith('.js')
                    ){
                        const resolvedPath = pathToFileURL(path.resolve(value[i])).href;
                        const module = await import(resolvedPath);
                        const html = await module.getHtml(viewModel);
                        if (typeof module.getHtml === 'function') {
                            viewModel.displayRules[key][i] = html;
                        } else {
                            console.warn(`A(z) ${el} the module not export 'getHtml' function.`);
                            viewModel.displayRules[key][i] = '<!-- Error: needed getHtml() -->';
                        }
                    }
                }
            }else if(
                typeof value === 'string' &&
                value.endsWith('.js')
            ){
                const resolvedPath = pathToFileURL(path.resolve(value)).href;
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
}