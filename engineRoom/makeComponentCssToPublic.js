import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'components');
const targetDir = path.join(__dirname, '..', 'public', 'css', 'components');
const allowedExtensions = ['.css']; // csak ezek a fájltípusok kellenek

async function copyCssFiles(srcDir, trgDir, extensions) {
    if (process.env.NODE_ENV !== 'development') return;

    // Célmappa tisztítása és újra létrehozása
    fs.stat(trgDir, function(err) {
        if (!err) {
            fs.rm(trgDir, { recursive: true, force: true });
        }
        else if (err.code === 'ENOENT') {
        //console.log('file or directory does not exist');
        }
    });
    fs.mkdir(trgDir, { recursive: true });

    const components = await  fs.readdir(srcDir, { withFileTypes: true })

    for (const component of components) {
        const sourcePath = path.join(srcDir, component.name);
        const targetPath = path.join(trgDir, component.name);

        if (component.isDirectory()) {
            await copyCssFiles(sourcePath, targetPath, extensions);
          } else if (extensions.includes(path.extname(component.name))) {
            await fs.copyFile(sourcePath, targetPath);
            //console.log(`Copied: ${sourcePath} → ${targetPath}`);
        }        
    }
}

copyCssFiles(sourceDir, targetDir, allowedExtensions)
.then(() => console.log(`✓ ${allowedExtensions.join()} copied.`))
.catch(err => console.error(`✗ ${allowedExtensions.join()} copy error:`, err.message,
err.stack));