const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

/*const mysql = require('mysql2');
const db = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '1234',
	database : 'my_db'
});
db.connect();*/

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/chat_index.html');
});

// Handle dynamic room creation based on user IDs
io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('join', (userId, userName, room) => {
        // Join the specified room
        socket.join(room);

        console.log('hi');
        
        // 데이터베이스에서 채팅 기록 가져오기
        /*db.query(
            `SELECT sender_name, message FROM chat_messages WHERE room = ? ORDER BY id`,
            [room],
            (err, results) => {
                if (err) throw err;
        
                // 결과에서 메시지 추출
                for (const result of results) {
                    // 방에 참가한 사용자에게 메시지 전송
                    socket.to(room).emit('chat message', result.sender_name, result.message);
                    console.log(result);
                }
        
                // 다른 사용자들에게 새로운 사용자 입장을 알림
                socket.to(room).emit('chat message', '시스템', `${userId} ${userName} 님이 방에 참가하셨습니다.`);
            }
        );*/
        
        // Notify other users in the room about the new user
        socket.to(room).emit('chat message', 'System', `${userId} ${userName} has joined the room`);

        // Handle chat messages in the room
        socket.on('chat message', (msg) => {
            // Save the message to the database
            //db.query(`INSERT INTO chat_messages (sender_id, sender_name, room, message) VALUES (?, ?, ?, ?)`,
            // [userId, userName, room, msg], (err) => {
            //    if (err) throw err;
            //    console.log('Message saved to database');
            //});

            // Send the message to the specific room
            io.to(room).emit('chat message', userName, msg);
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = 1234;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
