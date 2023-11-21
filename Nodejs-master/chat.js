const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'chat'
});
db.connect();

app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/chat.html');
});

io.on('connection', (socket) => {
    db.query(`SELECT * from chat`, [], (error, rows) => {
        if (error || rows.length == 0) return;
        for(var i = 0; i < rows.length; i++){
            var json = JSON.stringify(rows[i]);
            var userinfo = JSON.parse(json);
            io.emit('chat message', userinfo.description);
        }
    });
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});