const server = require('../app.js');
const io = require('socket.io')(server);

io.on('connection', (socket) => {
	console.log('[socketio] Someone connected!', socket)
});