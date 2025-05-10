import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass'
import { componentsDir, cssComponentsDir } from '#criticalPaths';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = componentsDir;
const targetDir = cssComponentsDir;
const allowedExtensions = ['.css','.sass','.scss'];

async function copyCssFiles(srcDir, trgDir, extensions) {
    if (process.env.NODE_ENV !== 'development') return;

    // Célmappa tisztítása és újra létrehozása
    try {
        await fs.rm(trgDir, { recursive: true, force: true });
    } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error on deletion: ${trgDir}`, err);
          throw err;
        }
    }
    await fs.mkdir(trgDir, { recursive: true });

    const components = await  fs.readdir(srcDir, { withFileTypes: true })

    for (const component of components) {
        const sourcePath = path.join(srcDir, component.name);
        const targetPath = path.join(trgDir, component.name);

        if (component.isDirectory()) {
            await copyCssFiles(sourcePath, targetPath, extensions);
          } else if (extensions.includes(path.extname(component.name))) {
            if (['.sass','.scss'].includes(path.extname(component.name))){
                const newName = component.name.split('.')[0] + '.css';
                const result = sass.compile(sourcePath, { style: 'expanded' });
                const outputPath = path.join(path.dirname(targetPath), newName);
                await fs.mkdir(path.dirname(outputPath), { recursive: true });
                await fs.writeFile(outputPath, result.css);
                console.log(`Compiled: ${sourcePath} → ${outputPath}`); 
            }else{
                await fs.mkdir(path.dirname(targetPath), { recursive: true });
                await fs.copyFile(sourcePath, targetPath);
                console.log(`Copied: ${sourcePath} → ${targetPath}`);
            }
        }
    }
}

copyCssFiles(sourceDir, targetDir, allowedExtensions)
.then(() => console.log(`✓ ${allowedExtensions.join()} copied.`))
.catch(err => console.error(`✗ ${allowedExtensions.join()} copy error:`, err.message,
err.stack));