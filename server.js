import http from 'node:http';

const server = http.createServer((req,res) => {})
const port = 3000;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});