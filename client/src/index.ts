import socket = require('socket.io-client');

const {socketConfig, socketUrl, browserSyncOptions} = window.___browserSync___;

const io = socket(socketUrl, socketConfig);

console.log('Here we are!');
