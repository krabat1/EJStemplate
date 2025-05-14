import http from 'node:http';
import ejs from 'ejs';
import path from 'node:path';
import { URLPattern, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import 'dotenv/config';
import  './engineRoom/makeComponentCssToPublic.js';
import { resolveDynamicContent } from './engineRoom/resolveDynamicContent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mimeTypes = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.html': 'text/html'
};

const handlerHome = {
    displayRules: {
        thisName: 'handlerHome',
        c1: [true, false],
        c2: [true, true],
        c3: [false, true],
        // used partials: c11,c21,c23,c33,c32 (c32 always)
        c11_content: ['testComponent/test.js'],
        c21_content: '<p>c21_content ejstest: <%= ejstest %>+<%= ejstestb %></p>',
        c23_content: '<p>c23_content from viewModel</p>',
        c33_content: '<p>c33_content from viewModel</p>',
        c32_content: '<p>c32_content from viewModel</p>',
        c11_ejsData:[{
            testString: 'apple theft',
        },],
        c21_ejsData:{
            ejstest: 'apple theft',
            ejstestb: 'apple theft_b',
        },
    }
}

const routes = [
    { pattern: new URLPattern({ pathname: '/'}), routeModel: handlerHome }
]

/**
 * Renders an EJS template based on `viewModel`.
 *
 * Uses `layout.ejs` and arranges HTML snippets and CSS links according 
 * to the contents of `viewModel.displayRules`. 
 * Content snippets (_content keys) are join()-ed, 
 * CSS links are timestamped to avoid caching.
 * 
 * @async
 * @function render
 * @param {Object} viewModel - The object that contains the `displayRules` key.
 * @param {Object} viewModel.displayRules - It has `_content`, `_ejsData` and `headCssLinks` keys.
 * @param {string|string[]} viewModel.displayRules.[* _content] - One or more HTML fragments that are join()-ed by the system.
 * @param {string[]|string[][]} viewModel.displayRules.headCssLinks - Path to one or more CSS files that will be flattened.
 * @returns {Promise<string>} - The final rendered HTML text.
 */
const render = async ( viewModel ) => {
    const layoutPath = path.join(__dirname, 'views', 'layout.ejs');
    // When the html data is an array, join it.
    // The specified style urls, whether in an array or not, 
    // are passed as they are into the headCssLinks property, and we flatten 
    // this at the end of the process to get an array of strings.
    const keys = Object.keys(viewModel.displayRules)
    keys.forEach((key) => {
        if(key.endsWith('_content')){
            if(Array.isArray(viewModel.displayRules[key])){
                viewModel.displayRules[key] = viewModel.displayRules[key].join('')
            }
        }
    })
    viewModel.displayRules.headCssLinks = viewModel.displayRules.headCssLinks.flat(Infinity);
    // add timestamp to css url
    viewModel.displayRules.headCssLinks = appendTimestampToCss(
        viewModel.displayRules.headCssLinks.flat(Infinity)
    );

    return await ejs.renderFile(layoutPath, { viewModel });
};

/**
 * The CSS links are timestamped to avoid caching.
 * 
 * @param {string[]|string[][]} links 
 * @returns the simestamped links in a flat array
 */
function appendTimestampToCss(links) {
    const timeStamp = Date.now();
    return links.map((link, index) => link + `?v=${timeStamp + index}`);
}

/**
 * Constructor function for viewModel Object.
 * Helps to keep the server stateless.
 * @returns an empty viewModel Object.
 */
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
        c11_ejsData:{},
        c13_ejsData:{},
        c21_ejsData:{},
        c23_ejsData:{},
        c31_ejsData:{},
        c32_ejsData:{},
        c33_ejsData:{},
        headCssLinks: []
        }
    };
}

/**
 * The server serves the public directory statically. 
 * It looks through the routes array, if it finds a match 
 * between the URLPattern and the request url, it calls 
 * the handler function associated with the route. 
 * If there is no match, it returns a 404 response, 
 * otherwise it returns a 500 response.
 *
 * @param {Object} req 
 * @param {Object} res 
 */
const server = http.createServer( async (req,res) => {
    try{
        const url = new URL(req.url, 'http://localhost'); // important: base URL required
        const pathname = url.pathname; // this just gives the path e.g.: "/css/components/testComponent/test.css"
        const staticFilePath = path.join(__dirname, '..', 'public', pathname);
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
                const checkResult = await consistencyCheck(route.routeModel);
                if(!checkResult.ok){
                    throw checkResult.error
                }else{
                    console.log(checkResult.result)
                }
                await handleRoute(req, res, match, route.routeModel);
                return;
            }
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }catch(err){
        res.writeHead(500);
        res.end(`Error:......${err}
Message:....${err.message}
Stack:......${err.stack}`);
    }
})

/** The handler function declares a viewModel object using 
 * the createBaseViewModel() constructor. The viewModel contains 
 * the display rules:
 * - The boolean values ​​in the c1, c2, c3 properties indicate 
 * the first and last partial used for the given folder, respectively.
 * - The _content keys indicate the components used for 
 * partials marked with the true value (path from the src/components folder).
 * - The _ejsData keys contain the object to be passed to 
 * the .ejs file of the component specified in the _content key, 
 * according to its numerical value.
 * - The headCssLinks property is an empty array by default, but 
 * if we provide a path to a style file ( css/style1234.css ), 
 * it will be processed. If the public/css/style1234.css file is in place, 
 * we will not get an error on the console.
 * The compiled viewModel is sent to the resolveDynamicContent() method.
 * After processing, once the viewModel is populated with the rendered 
 * html data of each part, it is sent to the root element of the .ejs 
 * structure, layout.ejs, via the render() function.
 * 
 * @param {Object} req 
 * @param {Object} res - response
 * @param {Object} match 
 * @param {Object} routeModel - The object belonging to the given route, effectively viewModel
 */
async function handleRoute(req, res, match, routeModel) {
    const viewModel = createBaseViewModel();
    //Object.assign(viewModel.displayRules, routeModel.displayRules);
    const displayRules = { ...viewModel.displayRules, ...routeModel.displayRules };
    viewModel.displayRules = displayRules;
    await resolveDynamicContent( viewModel );

    const html = await render( viewModel );
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

/**
 * Check routeModel to avoid mistakes
 * 
 * @param {Object} routeModel 
 */
async function consistencyCheck(routeModel){
    const checkModel = createBaseViewModel();
    const keys = Object.keys(checkModel.displayRules);
    for(const key of keys){
        if (key.endsWith('_content')){
            if(Array.isArray(routeModel.displayRules[key])){
                const needLenght = routeModel.displayRules[key].length;
                const ejsDataKey = key.split('_')[0] + '_ejsData';
                if(
                    !Array.isArray(routeModel.displayRules[ejsDataKey]) ||
                    routeModel.displayRules[ejsDataKey].length !== needLenght
                    ){
                        return {ok: false, error: new Error(`${ejsDataKey} must be the same length array (of object) as ${key}!`)}
                }
            }
        }
    }
    return { ok: true, result: `✓ routeModel is consistent on ${routeModel.displayRules.thisName}` };
}

const port = 3000;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});