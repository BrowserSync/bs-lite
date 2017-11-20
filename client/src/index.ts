import socket = require('socket.io-client');

const {socketConfig, socketUrl, browserSyncOptions} = window.___browserSync___;

const io = socket(socketUrl, socketConfig);

io.on('connection', function(data) {
    console.log(data);
});

io.on('browser:reload', (event) => {
    console.log('reloading');
    window.location.reload(true);
});

