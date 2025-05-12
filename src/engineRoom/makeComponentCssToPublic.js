import fs from 'node:fs/promises';
import path from 'node:path';
import * as sass from 'sass'
import { rootDir, componentsDir, cssComponentsDir } from '#criticalPaths';

const sourceDir = componentsDir;
const targetDir = cssComponentsDir;
const allowedExtensions = ['.css','.sass','.scss'];

/**
 * The method will only run if NODE_ENV is set to 'development'.
 * First, it deletes the entire public/css/components folder, 
 * then creates an empty one.
 * Reads the contents of the folder, iterates through it in a for loop.
 * If it finds a directory, it creates it in the target folder, if 
 * it finds a file and it has the extension .scss or .sass, it compiles it 
 * and writes it directly to the target directory. If the file found 
 * has the extension .css, it copies it to the target directory.
 * 
 * @param {string} srcDir source folder (sourceDir)
 * @param {string} trgDir target folder (targetDir)
 * @param {string[]} extensions allowed extensions (allowedExtensions)
 * @returns nothing.
 */
async function copyCssFiles(srcDir, trgDir, extensions) {
    if (process.env.NODE_ENV !== 'development') return;

    // Delete and recreate the destination folder
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
                console.log(`Compiled: ${path.relative(rootDir,sourcePath)} → ${path.relative(rootDir,outputPath)}`); 
            }else{
                await fs.mkdir(path.dirname(targetPath), { recursive: true });
                await fs.copyFile(sourcePath, targetPath);
                console.log(`Copied: ${path.relative(rootDir,sourcePath)} → ${path.relative(rootDir,targetPath)}`);
            }
        }
    }
}

copyCssFiles(sourceDir, targetDir, allowedExtensions)
.then(() => console.log(`✓ ${allowedExtensions.join()} copied.`))
.catch(err => console.error(`✗ ${allowedExtensions.join()} copy error:`, err.message,
err.stack));