var http = require('http');

var server = http.createServer(function (request, response) {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end('Случай в театре. Спектакль для детей. Момент, где вот-вот должен появиться главный злодей - свет выключен, оркестр настороженно так жужжит. в зале тишина. И тут такой тоненький детский голосок: "Еб твою мать! Страшно-то как!!!\n');
});

server.listen(8100);
