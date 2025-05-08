import path from 'path';
import fs from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
                        // We push the component's public css paths into the headcsslinks property
                        let relativePath = path.dirname(
                            path.relative(
                                path.join(__dirname,'..'), fileURLToPath(resolvedPath)
                            )
                        )
                        const dirContent = fs.readdirSync(relativePath, { withFileTypes: true })
                        for( const item of dirContent){
                            if('.css'.includes(path.extname(item.name))){
                                const cssPath = (path.join('css/',item.parentPath,item.name))
                                viewModel.displayRules.headCssLinks.push(cssPath)
                            }
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
                // We push the component's public css paths into the headcsslinks property
                let relativePath = path.dirname(
                    path.relative(
                        path.join(__dirname,'..'), fileURLToPath(resolvedPath)
                    )
                )
                const dirContent = fs.readdirSync(relativePath, { withFileTypes: true })
                for( const item of dirContent){
                    if('.css'.includes(path.extname(item.name))){
                        const cssPath = (path.join('css/',item.parentPath,item.name))
                        viewModel.displayRules.headCssLinks.push(cssPath)
                    }
                }
            }
        }
    }
}