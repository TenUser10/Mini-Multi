const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let players = {};
let bullets = [];
let weapons = []; // Danh sách vũ khí dưới sàn

// Hàm tạo ngẫu nhiên một món vũ khí trên bản đồ
function spawnWeapon() {
    if (weapons.length < 5) { // Tối đa 5 vũ khí xuất hiện cùng lúc trên sàn
        weapons.push({
            id: Math.random().toString(36).substring(2, 9),
            x: Math.random() * 1200 + 100,
            y: Math.random() * 700 + 100,
            type: 'powerup' // Loại vũ khí/vật phẩm tăng sức mạnh
        });
    }
}

// Cứ mỗi 5 giây sẽ rơi ra vũ khí mới nếu chưa đủ số lượng
setInterval(spawnWeapon, 5000);

io.on('connection', (socket) => {
    console.log(`Người chơi kết nối: ${socket.id}`);

    players[socket.id] = {
        name: "Player",
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100,
        angle: 0,
        hp: 100,
        score: 0,
        color: '#4CAF50'
    };

    socket.emit('currentPlayers', players);
    socket.emit('currentWeapons', weapons); // Gửi danh sách vũ khí hiện có cho người mới vào

    socket.on('updatePlayerInfo', (data) => {
        if (players[socket.id]) {
            if (data.name) players[socket.id].name = data.name;
            if (data.color) players[socket.id].color = data.color;

            socket.broadcast.emit('newPlayer', {
                id: socket.id,
                player: players[socket.id]
            });
        }
    });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id] && players[socket.id].hp > 0) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].angle = movementData.angle;
            
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: players[socket.id].x,
                y: players[socket.id].y,
                angle: players[socket.id].angle
            });

            // Kiểm tra va chạm nếu người chơi đi nhặt vũ khí dưới sàn
            for (let i = weapons.length - 1; i >= 0; i--) {
                let w = weapons[i];
                let dist = Math.hypot(players[socket.id].x - w.x, players[socket.id].y - w.y);
                if (dist < 25) { // Nhặt được vũ khí
                    players[socket.id].score += 50; // Thưởng 50 điểm khi nhặt súng
                    weapons.splice(i, 1); // Xóa vũ khí khỏi sàn

                    // Báo về cho tất cả mọi người cập nhật điểm và vũ khí biến mất
                    io.emit('weaponCollected', {
                        weaponId: w.id,
                        collectorId: socket.id,
                        newScore: players[socket.id].score
                    });
                    break;
                }
            }
        }
    });

    socket.on('shoot', (bulletData) => {
        if (players[socket.id] && players[socket.id].hp > 0) {
            bullets.push({
                ownerId: socket.id,
                x: bulletData.x,
                y: bulletData.y,
                dx: bulletData.dx,
                dy: bulletData.dy
            });
        }
    });

    socket.on('respawn', () => {
        if (players[socket.id]) {
            players[socket.id].hp = 100;
            players[socket.id].x = Math.random() * 600 + 100;
            players[socket.id].y = Math.random() * 400 + 100;

            io.emit('updateStats', {
                victimId: socket.id,
                victimHp: players[socket.id].hp,
                victimX: players[socket.id].x,
                victimY: players[socket.id].y,
                shooterId: null,
                shooterScore: players[socket.id].score
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Người chơi ngắt kết nối: ${socket.id}`);
        delete players[socket.id];
        io.emit('disconnectPlayer', socket.id);
    });
});

// Game Loop Server
setInterval(() => {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.dx;
        b.y += b.dy;

        let bulletHit = false;

        Object.keys(players).forEach((id) => {
            if (id !== b.ownerId && !bulletHit) {
                let p = players[id];
                if (p.hp > 0) {
                    let dist = Math.hypot(p.x - b.x, p.y - b.y);

                    if (dist < 15) {
                        bulletHit = true;
                        p.hp -= 10;
                        if (p.hp < 0) p.hp = 0;

                        if (players[b.ownerId]) {
                            players[b.ownerId].score += 10;
                        }

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
            }
        });

        if (bulletHit || b.x < 0 || b.x > 3000 || b.y < 0 || b.y > 3000) {
            bullets.splice(i, 1);
        }
    }

    io.emit('bulletsUpdate', bullets);
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});