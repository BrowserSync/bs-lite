import socket = require('socket.io-client');
import {AssetReload, BrowserMessages, BrowserReload} from "../../src/plugins/Sockets/Clients/BrowserMessageTypes";
import Reasons = AssetReload.Reasons;
import {Reloader} from './vendor/ReReloader';
import {Timer} from "./vendor/Timer";
const nanlogger = require('nanologger');
const log = nanlogger('Browsersync', {colors: {magenta: '#0F2634'}});

const reloader = new Reloader(window, window.console, Timer);

const {socketConfig, socketUrl, browserSyncOptions} = window.___browserSync___;

const io = socket(socketUrl, socketConfig);

log.trace('adding connection listener');
io.on('connection', function(data) {
    log.info('Connected!', data);
});

log.trace('adding BrowserMessages.BrowserReload listener');
io.on(BrowserMessages.BrowserReload, (message: BrowserReload.Message) => {
    log.debug(BrowserMessages.BrowserReload, message);
    window.location.reload(true);
});

log.trace('adding BrowserMessages.AssetReload listener');
io.on(BrowserMessages.AssetReload, (message: AssetReload.Payload) => {
    log.debug(BrowserMessages.AssetReload, message);
    if (message.reason === Reasons.FileChanged) {
        message.items.forEach(item => {
            reloader.reload(item.path, {liveCSS: true});
        })
    }
});
