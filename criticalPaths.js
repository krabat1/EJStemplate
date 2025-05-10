import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = __dirname;

const srcDir =           path.join(rootDir, 'src');
const publicDir =        path.join(rootDir, 'public');
const componentsDir =    path.join(srcDir, 'components');
const viewsDir =         path.join(srcDir, 'views');
const cssComponentsDir = path.join(rootDir, 'css', 'components'); // * skip public

export {
  rootDir,
  srcDir,
  componentsDir,
  viewsDir,
  publicDir,
  cssComponentsDir
};