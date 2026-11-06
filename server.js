const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

const players = {};

io.on('connection', (socket) => {
  console.log('Người chơi kết nối:', socket.id);

  players[socket.id] = {
    id: socket.id,
    x: Math.random() * 600 + 100,
    y: Math.random() * 400 + 100,
    angle: 0,
    score: 0,
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };

  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('playerInput', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].angle = movementData.angle;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('shoot', (bulletData) => {
    io.emit('bulletFired', { ...bulletData, playerId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('Người chơi thoát:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});