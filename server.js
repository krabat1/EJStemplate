import http from 'node:http';
import ejs from 'ejs';
import path from 'node:path';
import { URLPattern, fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const render = async (templateName, data = {}) => {
    const filePath = path.join(__dirname, 'views', templateName);
    const layoutPath = path.join(__dirname, 'views', 'layout.ejs');
    const content = await ejs.renderFile(filePath, data);
    return await ejs.renderFile(layoutPath, { ...data, content });
};

const mimeTypes = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.html': 'text/html'
};

const routes = [
    { pattern: new URLPattern({ pathname: '/'}), handler: handlerHome }
]
function createBaseViewModel() {
    return {
        displayRules: {
        c1: [false, false],   // first.ejs & third.ejs not include
        c2: [false, false], // alpha.ejs & gamma.ejs not include
        c3: [false, false],   // primo.ejs & tertio.ejs not include
        // the content (second.ejs -> beta.ejs -> secundo.ejs always included)
        c11_content: null,
        c13_content: null,
        c21_content: null,
        c23_content: null,
        c31_content: null,
        c32_content: null,
        c33_content: null,
        }
    };
}

const server = http.createServer( async (req,res) => {
    try{

        const staticFilePath = path.join(__dirname, 'public', req.url);
        if (fs.existsSync(staticFilePath) && fs.statSync(staticFilePath).isFile()) {
            const ext = path.extname(staticFilePath);
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
            fs.createReadStream(staticFilePath).pipe(res);
            return;
        }

        for (const route of routes) {
            const match = route.pattern.exec(req.url);
            if (match) {
                await route.handler(req, res, match);
                return;
            }
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }catch(err){
        res.writeHead(500);
        res.end('Error: ' + err.message);
    }
})

async function handlerHome(req, res, match) {
    const viewModel = createBaseViewModel();
    viewModel.displayRules = {
        c1: [true, false],   
        c2: [true, true], 
        c3: [false, true],
        // used partials: c11,c21,c23,c33,c32 (c32 always)
        c11_content: `<p>c11_content from viewModel</p>`,
        c21_content: '<p>c21_content from viewModel</p>',
        c23_content: '<p>c23_content from viewModel</p>',
        c33_content: '<p>c33_content from viewModel</p>',
        c32_content: '<p>c32_content from viewModel</p>', 
    }
    const html = await render('layout.ejs', { viewModel: viewModel } );
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

const port = 3000;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});