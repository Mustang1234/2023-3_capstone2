const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());

// 클라이언트 정보 저장할 객체
const clients = {};

io.on('connection', (socket) => {
    console.log('User connected');

    // 클라이언트 정보 수신 및 저장
    socket.on('join', (clientId, clientName) => {
        clients[clientId] = {
            socket: socket,
            name: clientName,
        };

        // 클라이언트에게 연결 성공 메시지 전송
        socket.emit('connected', { message: 'Successfully connected to the server' });
    });

    // 클라이언트에게 메시지 전송
    socket.on('send', (clientId, message) => {
        const senderName = clients[clientId].name;

        // 수신자에게 메시지 전송
        socket.emit('message', { sender: senderName, text: message });

        // 현재 연결된 모든 클라이언트에게 메시지 전송
        Object.keys(clients).forEach((id) => {
            if (id !== clientId) {
                clients[id].socket.emit('message', { sender: senderName, text: message });
            }
        });
    });

    // 클라이언트 연결 해제 시 처리
    socket.on('disconnect', () => {
        console.log('User disconnected');

        // 연결이 끊긴 클라이언트 정보 삭제
        const disconnectedClientId = Object.keys(clients).find((id) => clients[id].socket === socket);
        delete clients[disconnectedClientId];
    });
});

const PORT = 1234;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
