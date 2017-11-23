import socket = require('socket.io-client');
const nanlogger = require('nanologger');
const log = nanlogger('Browsersync', {colors: {magenta: '#0F2634'}});

const {socketConfig, socketUrl, browserSyncOptions} = window.___browserSync___;

const io = socket(socketUrl, socketConfig);

io.on('connection', function(data) {
    log.info('Connected!', data);
});

io.on('Browser:Reload', (event) => {
    log.info('Browser:Reload', event);
});

