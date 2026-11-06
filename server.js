const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
    console.log(`Người chơi kết nối: ${socket.id}`);

    players[socket.id] = {
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100,
        angle: 0,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        score: 0
    };

    socket.emit('currentPlayers', players);

    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        player: players[socket.id]
    });

    // Nhận tọa độ và góc xoay súng, sau đó broadcast cho người khác
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].angle = movementData.angle;
            
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: players[socket.id].x,
                y: players[socket.id].y,
                angle: players[socket.id].angle
            });
        }
    });

    // Đồng bộ sự kiện bắn đạn giữa các màn hình
    socket.on('shoot', (bulletData) => {
        io.emit('bulletFired', {
            id: socket.id,
            x: bulletData.x,
            y: bulletData.y,
            dx: bulletData.dx,
            dy: bulletData.dy
        });
    });

    socket.on('disconnect', () => {
        console.log(`Người chơi ngắt kết nối: ${socket.id}`);
        delete players[socket.id];
        io.emit('disconnectPlayer', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});