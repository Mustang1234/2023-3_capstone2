const http = require('http');
const cookie = require('cookie');
http.createServer(function(req, res){
    var cookie_recv = {}
    if(req.headers.cookie !== undefined){
        cookie_recv = cookie.parse(req.headers.cookie)
    }
    else{
        res.writeHead(200, {
            'Set-Cookie':['cookie1=fdsa; Max-Age=10',
             'cookie2=rewq; Max-Age=10, HttpOnly, Path=/cookie']
        })
    }
    res.end('Cookie!!!');
}).listen(4000);