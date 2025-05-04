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


/*const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'components');
const targetDir = path.join(__dirname, '..', 'public', 'css', 'components');
console.log('sourceDir',fs.readdirSync(sourceDir)) // sourceDir [ 'testComponent' ]
console.log('targetDir',fs.readdirSync(targetDir)) // targetDir []

function copyCssFiles() {
    console.log('process.env.NODE_ENV',process.env.NODE_ENV)

    if (process.env.NODE_ENV === 'development') {

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }else{
            fs.rmSync(targetDir, { recursive: true, force: true })
            fs.mkdirSync(targetDir, { recursive: true });
        }
    
        const components = fs.readdirSync(sourceDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory());

        for (const component of components) {
            const cssPath = path.join(sourceDir, component.name, `${component.name}.css`);
            if (fs.existsSync(cssPath)) {
                const targetPath = path.join(targetDir, `${component.name}.css`);
                if (fs.existsSync(targetPath)) {
                    throw new Error(`ERROR: A '${component.name}.css' already exist in the target folder!`);
                }
                fs.copyFileSync(cssPath, targetPath);
                console.log(`✓ ${component.name}.css copied to public/css/`);
            }
        }
    }
}

copyCssFiles();*/