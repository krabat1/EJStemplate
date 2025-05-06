import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'components');
const targetDir = path.join(__dirname, '..', 'public', 'css', 'components');

function copyCssFiles() {
    if (process.env.NODE_ENV !== 'development') return;

    // Célmappa tisztítása és újra létrehozása
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    const components = fs.readdirSync(sourceDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory());

    for (const component of components) {
        const componentPath = path.join(sourceDir, component.name);
        const files = fs.readdirSync(componentPath);

        const cssFiles = files.filter(file => file.endsWith('.css'));
        for (const cssFile of cssFiles) {
            const src = path.join(componentPath, cssFile);
            const dest = path.join(targetDir, cssFile);

            if (fs.existsSync(dest)) {
                console.warn(`⚠️ A '${cssFile}' már létezik a célmappában, felülírásra kerül.`);
            }

            fs.copyFileSync(src, dest);
            console.log(`✓ ${cssFile} átmásolva.`);
        }
    }
}

copyCssFiles();