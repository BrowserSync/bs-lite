import socket = require('socket.io-client');

const {socketConfig, socketUrl, browserSyncOptions} = window.___browserSync___;

const io = socket(socketUrl, socketConfig);

io.on('connection', function(data) {
    console.log(data);
});

io.on('Browser:Reload', (event) => {
    console.log('Browser:Reload', event);
    // window.location.reload(true);
});

