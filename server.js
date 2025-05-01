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
const viewModel = {
    displayRules: {
        body: [false, false],   // first.ejs & third.ejs not include
        second: [false, false], // alpha.ejs & gamma.ejs not include
        beta: [false, false],   // primo.ejs & tertio.ejs not include
        // the content (second.ejs -> beta.ejs -> secundo.ejs always included)
    }
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
    const currentViewModel = viewModel
    currentViewModel.displayRules = {
        body: [true, false],   
        second: [true, true], 
        beta: [false, true],   
    }
    const html = await render('layout.ejs', { viewModel: currentViewModel } );
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

const port = 3000;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});