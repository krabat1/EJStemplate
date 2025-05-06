import http from 'node:http';
import ejs from 'ejs';
import path from 'node:path';
import { URLPattern, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import 'dotenv/config';
import './engineRoom/makeComponentCssToPublic.js';
import { resolveDynamicContent } from './engineRoom/resolveDynamicContent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const render = async (templateName, data = {}) => {
    const filePath = path.join(__dirname, 'views', templateName);
    const layoutPath = path.join(__dirname, 'views', 'layout.ejs');

    // When the html data is an array, join it.
    // The specified style urls, whether in an array or not, are passed as they are into the headCssLinks property, and we flatten this at the end of the process to get an array of strings.
    const keys = Object.keys(data.viewModel.displayRules)
    keys.forEach((key) => {
        if(key.match(/^c(\d+)_content$/)){
            if(Array.isArray(data.viewModel.displayRules[key])){
                data.viewModel.displayRules.key = data.viewModel.displayRules[key].join('')
            }
        }else if(key.match(/^c(\d+)_style$/)){
            if(data.viewModel.displayRules[key] !== null){
                data.viewModel.displayRules.headCssLinks.push(data.viewModel.displayRules[key]);
            } 
        }
    })
    data.viewModel.displayRules.headCssLinks = data.viewModel.displayRules.headCssLinks.flat(Infinity);
    // add timestamp to css url
    const timeStamp = (new Date).getTime();
    data.viewModel.displayRules.headCssLinks.forEach((link, index) => {
        data.viewModel.displayRules.headCssLinks[index] = data.viewModel.displayRules.headCssLinks[index] + '?v=' + (timeStamp + index)
    })

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
        c1: [false, false],   
        c2: [false, false], 
        c3: [false, false],   
        // the content (c12.ejs -> c22.ejs -> v32.ejs always included)
        c11_content: null,
        c13_content: null,
        c21_content: null,
        c23_content: null,
        c31_content: null,
        c32_content: null,
        c33_content: null,
        c11_style: null,
        c13_style: null,
        c21_style: null,
        c23_style: null,
        c31_style: null,
        c32_style: null,
        c33_style: null,
        headCssLinks: []
        }
    };
}

const server = http.createServer( async (req,res) => {
    try{
        const url = new URL(req.url, 'http://localhost'); // fontos: base URL kell
        const pathname = url.pathname; // ez csak az útvonalat adja: "/css/components/test.css"
        const staticFilePath = path.join(__dirname, 'public', pathname);
        //const staticFilePath = path.join(__dirname, 'public', req.url);

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
    Object.assign(viewModel.displayRules, {
        c1: [true, false],
        c2: [true, true],
        c3: [false, true],
        // used partials: c11,c21,c23,c33,c32 (c32 always)
        c11_content: ['components/testComponent/test.js'],
        c21_content: '<p>c21_content from viewModel</p>',
        c23_content: '<p>c23_content from viewModel</p>',
        c33_content: '<p>c33_content from viewModel</p>',
        c32_content: '<p>c32_content from viewModel</p>',
        c11_style: 'css/components/test.css',
        testString: 'apple theft',
    });

    await resolveDynamicContent(viewModel);

    const html = await render('layout.ejs', { viewModel: viewModel } );
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

const port = 3000;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});