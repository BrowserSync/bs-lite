import socket = require('socket.io-client');
import {AssetReload, BrowserMessages, BrowserReload} from "../../src/plugins/Sockets/Clients/BrowserMessageTypes";
import {FileEvent} from "../../src/plugins/Watcher/FileEvent.message";
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
    const elems = Array.from(document.getElementsByTagName('LINK'));
    const names = elems.map((e: any, i) => {
        const a: any = document.createElement('A');
        a.href = e.href;
        const segs = a.pathname.split('/').filter(Boolean);
        const name = segs.slice(-1)[0];
        return {
            name,
            href: a.href,
            index: i,
        };
    });
    message.items.forEach((item: FileEvent.Input) => {
        const matches = names.filter(x => x.name === item.parsed.base);
        if (matches.length) {
            log.info(`${matches.length} asset matches found`);
            matches.forEach(match => {
                changeCSS(match.href, match.index);
            });
        }
    })
});

function changeCSS(cssFile, cssLinkIndex) {
    var oldlink = document.getElementsByTagName("link").item(cssLinkIndex);
    var newlink = document.createElement("link");
    newlink.setAttribute("rel", "stylesheet");
    newlink.setAttribute("type", "text/css");
    newlink.setAttribute("href", cssFile);
    document.getElementsByTagName("head").item(0).replaceChild(newlink, oldlink);
}