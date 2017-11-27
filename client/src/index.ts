import socket = require('socket.io-client');
import {AssetReload, BrowserMessages, BrowserReload} from "../../src/plugins/Sockets/Clients/BrowserMessageTypes";
import {FileEvent} from "../../src/plugins/Watcher/FileEvent.message";
import {replace} from "./assets";
const nanlogger = require('nanologger');
const log = nanlogger('Browsersync', {colors: {magenta: '#0F2634'}});

const {socketConfig, socketUrl, browserSyncOptions} = window.___browserSync___;

const io = socket(socketUrl, socketConfig);

io.on('connection', function(data) {
    log.info('Connected!', data);
});

io.on(BrowserMessages.BrowserReload, (message: BrowserReload.Message) => {
    log.info(BrowserMessages.BrowserReload, message);
    window.location.reload(true);
});

io.on(BrowserMessages.AssetReload, (message: AssetReload.Payload) => {
    log.info(BrowserMessages.AssetReload, message);
    replace(message, log);
});