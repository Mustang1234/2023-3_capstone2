const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const mysql = require('mysql2');
const db = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '1234',
	database : 'my_db'
});
db.connect();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/chat_index.html');
});

// Handle dynamic room creation based on user IDs
io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('join', (userId, userName, room) => {
        // Join the specified room
        socket.join(room);

        // Notify other users in the room about the new user
        socket.to(room).emit('chat message', 'System', `${userId} ${userName} has joined the room`);

        // Handle chat messages in the room
        socket.on('chat message', (msg) => {
            // Save the message to the database
            //db.query(`INSERT INTO chat_messages (sender_id, sender_name, room, message) VALUES (?, ?, ?, ?)`,
            // [userId, userName, room, msg], (err) => {
            //    if (err) throw err;
                console.log('Message saved to database');
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
