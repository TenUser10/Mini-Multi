const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let players = {};
let bullets = [];

io.on('connection', (socket) => {
    console.log(`Người chơi kết nối: ${socket.id}`);

    players[socket.id] = {
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100,
        angle: 0,
        hp: 100,
        score: 0,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };

    socket.emit('currentPlayers', players);

    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        player: players[socket.id]
    });

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

    socket.on('shoot', (bulletData) => {
        bullets.push({
            ownerId: socket.id,
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

// Game Loop trên Server: Tính toán di chuyển của đạn và va chạm
setInterval(() => {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.dx;
        b.y += b.dy;

        let bulletHit = false;

        // Kiểm tra va chạm giữa đạn b và từng người chơi
        Object.keys(players).forEach((id) => {
            if (id !== b.ownerId && !bulletHit) {
                let p = players[id];
                let dist = Math.hypot(p.x - b.x, p.y - b.y);

                // Bán kính nhân vật là 15px
                if (dist < 15) {
                    bulletHit = true;
                    p.hp -= 10;

                    // Cộng điểm cho người bắn
                    if (players[b.ownerId]) {
                        players[b.ownerId].score += 10;
                    }

                    // Nếu hết máu thì hồi sinh lại ngẫu nhiên
                    if (p.hp <= 0) {
                        p.hp = 100;
                        p.x = Math.random() * 600 + 100;
                        p.y = Math.random() * 400 + 100;
                    }

                    // Gửi thông tin máu và điểm số mới cho tất cả các máy
                    io.emit('updateStats', {
                        victimId: id,
                        victimHp: p.hp,
                        victimX: p.x,
                        victimY: p.y,
                        shooterId: b.ownerId,
                        shooterScore: players[b.ownerId] ? players[b.ownerId].score : 0
                    });
                }
            }
        });

        // Xóa đạn khi va chạm hoặc bay quá xa
        if (bulletHit || b.x < 0 || b.x > 3000 || b.y < 0 || b.y > 3000) {
            bullets.splice(i, 1);
        }
    }

    // Phát vị trí đạn thời gian thực
    io.emit('bulletsUpdate', bullets);
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});