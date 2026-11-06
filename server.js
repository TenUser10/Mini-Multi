const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Phục vụ các file tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Lưu trữ danh sách toàn bộ người chơi đang kết nối
let players = {};

io.on('connection', (socket) => {
    console.log(`Người chơi kết nối: ${socket.id}`);

    // Khởi tạo người chơi mới với vị trí ngẫu nhiên
    players[socket.id] = {
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100,
        color: '#' + Math.floor(Math.random()*16777215).toString(16), // Màu ngẫu nhiên cho từng người
        score: 0
    };

    // Gửi danh sách hiện tại cho người chơi mới vừa vào
    socket.emit('currentPlayers', players);

    // Thông báo cho mọi người khác có người chơi mới vừa tham gia
    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        player: players[socket.id]
    });

    // Lắng nghe sự kiện di chuyển của người chơi
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            // Phát vị trí mới tới tất cả các client khác
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: players[socket.id].x,
                y: players[socket.id].y
            });
        }
    });

    // Xử lý khi có người chơi bắn đạn
    socket.on('shoot', (bulletData) => {
        // Phát sự kiện viên đạn bay tới tất cả mọi người
        io.emit('bulletFired', {
            id: socket.id,
            x: bulletData.x,
            y: bulletData.y,
            angle: bulletData.angle
        });
    });

    // Xử lý khi người chơi thoát game
    socket.on('disconnect', () => {
        console.log(`Người chơi ngắt kết nối: ${socket.id}`);
        delete players[socket.id];
        // Báo cho mọi người xóa nhân vật này khỏi màn hình
        io.emit('disconnectPlayer', socket.id);
    });
});
// Thay vì chỉ ghi cố định port 3000, ta dùng process.env.PORT để Render tự cấp port
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});