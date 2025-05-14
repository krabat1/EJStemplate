import path from 'path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'url';
import { componentsDir, srcDir } from '#criticalPaths';
import ejs from 'ejs';

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);

/**
 * I. Collect html data
 * The method determines the absolute path of the component (resolvedPath) 
 * based on the componentsDir and scriptPath.
 * It dynamically imports the module, then checks whether the given
 * component has the getHTML method.
 * If it doesn't, it tries to indicate this.
 * If it does, it calls this method, passing it the viewModel
 * and partialData properties. Then it stores the returned
 * string containing the html in a variable named html.
 * It replaces the value of the viewModel _content property 
 * with the received data.
 * 
 * @param {string} scriptPath the value of a _content property of the viewModel, 
 * the path to the component
 * @param {Object} viewModel 
 * @param {string} key the property key for scriptPath
 * @param {number} index when the viewModel stores multiple paths as an array, 
 * the index containing the scriptPath
 * @param {string} ejsDataKey a string that represents a key in the viewModel, 
 * the associated value of which is the object to be passed to the 
 * component with the data to be rendered.
 */
export async function processComponent(scriptPath, viewModel, key, index = null, ejsDataKey) {
    const resolvedPath = pathToFileURL(path.join(componentsDir, scriptPath)).href;

    try {
        const module = await import(resolvedPath);

        if (typeof module.getHtml === 'function') {
            const html = await module.getHtml(viewModel, ejsDataKey, index);
            if (index !== null) {
                viewModel.displayRules[key][index] = html;
            } else {
                viewModel.displayRules[key] = html;
            }
        } else {
            console.warn(`⚠️ A(z) "${scriptPath}" modul nem exportál getHtml() függvényt.`);
            setFallbackHtml(viewModel, key, index);
        }

        collectCssLinks(resolvedPath, viewModel.displayRules.headCssLinks);
    } catch (err) {
        console.error(`❌ Hiba a komponens importálása közben (${scriptPath}):`, err);
        setFallbackHtml(viewModel, key, index);
    }
}

/**
 * Gives a message if the component is missing the getHtml() method.
 * 
 * @param {Object} viewModel 
 * @param {string} key the property key for scriptPath
 * @param {number} index - when the viewModel stores multiple paths as an array, 
 * the index containing the scriptPath
 */
function setFallbackHtml(viewModel, key, index) {
    const fallback = '<!-- Error: needed getHtml() -->';
    if (index !== null) {
        viewModel.displayRules[key][index] = fallback;
    } else {
        viewModel.displayRules[key] = fallback;
    }
}

/**
 * II. Collecting .css urls for the <head> tag
 * The path.relative() method calculates the relative path from
 * srcDir to resolvedPath based on the absolute paths, using dirname()
 * we narrow this down to the given directory (relativePath).
 * It appends the 'css/' directory to the path (the public folder
 * is used for static serving, its contents are as if they were directly
 * in the root).
 * IMPORTANT that the folder examined here is the src/components folder,
 * NOT the public/css/components folder.
 * By looking through these files, using the filename, and 
 * (in the case of .sass and .scss) changing it to .css if necessary, 
 * it compiles the final link (cssPath) for the <head> tag.
 * Pushes the link into the viewModel's headCssLinks property, 
 * which is an array.
 * 
 * @param {*} resolvedPath - the absolute path of the component
 * @param {string[]} headCssLinks - property of the viewModel to 
 * store css links for <head> tag
 */
function collectCssLinks(resolvedPath, headCssLinks) {
    let relativePath = path.dirname(path.relative(srcDir, fileURLToPath(resolvedPath)));
    const cssDir = path.join('css', relativePath);
    const dirContent = fs.existsSync(cssDir)
        ? fs.readdirSync(cssDir, { withFileTypes: true })
        : [];

    for (const item of dirContent) {
        if (!item.isFile()) continue;

        const ext = path.extname(item.name).toLowerCase();
        if (ext === '.css') {
            const cssPath = path.join(cssDir, item.name).replace(/\\/g, '/');
            headCssLinks.push(cssPath);
        } else if (ext === '.scss' || ext === '.sass') {
            const cssName = item.name.replace(/\.(scss|sass)$/, '.css');
            const cssPath = path.join('css', relativePath, cssName).replace(/\\/g, '/');
            headCssLinks.push(cssPath);
        }
    }
}

/**
 * The method looks through the property keys of the received 
 * viewModel object ending in _content (which are paths to individual
 * components) and handles them depending on whether they are 
 * array values ​​or strings. Based on the key, it creates the ejsDataKey
 * variable, which stores the object to be passed to the component 
 * as a string with the data to be rendered.
 * The extracted data is passed along with the viewModel object to the
 * processComponent method.
 * 
 * @param {Object} viewModel 
 */
export async function resolveDynamicContent(viewModel) {
    for (const [key, value] of Object.entries(viewModel.displayRules)) {
        if (!key.endsWith('_content')) continue;
    
        const match = key.match(/(c\d+)_content/);
        if (!match) continue;
    
        const prefix = match[1];
        const ejsDataKey = `${prefix}_ejsData`;
        const ejsData = viewModel.displayRules[ejsDataKey] ?? {};
    
        if (Array.isArray(value)) {
          // Tömb: komponensek tömbje
          for (let i = 0; i < value.length; i++) {
            if (typeof value[i] === 'string' && value[i].endsWith('.js')) {
              await processComponent(value[i], viewModel, key, i, ejsDataKey);
            }
          }
        } else if (typeof value === 'string') {
            if (value.endsWith('.js')) {
                // Egyetlen komponens JS fájl
                await processComponent(value, viewModel, key, ejsDataKey);
            } else if (value.includes('<%')) {
                // EJS scriptlet kifejezések (pl. <%= ... %>, <% if (...) { %> stb.)
                try {
                    viewModel.displayRules[key] = ejs.render(value, ejsData);
                } catch (err) {
                    console.warn(`⚠️ Hiba történt a "${key}" renderelése közben: ${err.message}`);
                    viewModel.displayRules[key] = `<p style="color:red;">EJS render error: ${err.message}</p>`;
                }
            }
        }
    }
}