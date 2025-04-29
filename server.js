import http from 'node:http';
import ejs from 'ejs';
import path from 'node:path';
import { URLPattern, fileURLToPath } from 'node:url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const render = async (templateName, data = {}) => {
    const filePath = path.join(__dirname, 'views', templateName);
    const layoutPath = path.join(__dirname, 'views', 'layout.ejs');
    const content = await ejs.renderFile(filePath, data);
    return await ejs.renderFile(layoutPath, { ...data, content });
};

const server = http.createServer( async (req,res) => {
    try{

        const routes = [
            { pattern: new URLPattern({ pathname: '/'}), handler: handlerHome }
        ]

        routes.some(route => {
            const match = route.pattern.exec(req.url);
            if (match) {
                route.handler(match);
                return true;
            }
            return false;
        });

        async function handlerHome(match) {
            const html = await render('layout.ejs', {});
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        }

    }catch(err){
        res.writeHead(500);
        res.end('Error: ' + err.message);
    }
})
const port = 3000;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});