import path from 'path';
import { pathToFileURL } from 'url';

export async function resolveDynamicContent(displayRules) {
    for (const [key, value] of Object.entries(displayRules)) {
        if (
            key.endsWith('_content') &&
            Array.isArray(value) &&
            typeof value[0] === 'string' &&
            value[0].endsWith('.js')
        ) {
            const modulePath = path.resolve(value[0]);
            const module = await import(pathToFileURL(modulePath).href);
            if (typeof module.getHtml === 'function') {
                displayRules[key] = await module.getHtml();
            } else {
                console.warn(`A(z) ${value[0]} modul nem exportál 'getHtml' függvényt.`);
                displayRules[key] = '<!-- Hiba: hiányzó getHtml() -->';
            }
        }
    }
}