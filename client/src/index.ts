import socket = require('socket.io-client');
import {AssetReload, BrowserMessages, BrowserReload} from "../../src/plugins/Sockets/Clients/BrowserMessageTypes";
const nanlogger = require('nanologger');
const log = nanlogger('Browsersync', {colors: {magenta: '#0F2634'}});

const {socketConfig, socketUrl, browserSyncOptions} = window.___browserSync___;

const io = socket(socketUrl, socketConfig);

io.on('connection', function(data) {
    log.info('Connected!', data);
});

io.on(BrowserMessages.BrowserReload, (message: BrowserReload.Message) => {
    log.info(BrowserMessages.BrowserReload, message);
});

io.on(BrowserMessages.AssetReload, (message: AssetReload.Message) => {
    log.info(BrowserMessages.AssetReload, message);
});

