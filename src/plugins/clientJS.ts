import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Middleware} from "./server";
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
import {socketConnector} from "../connect-utils";
import {Options} from "../index";
import {readFileSync} from "fs";
import {client} from "../config";
const debug = require('debug')('bs:clientJS');

type ClientJSIncomingType = string|string[]|Processed|Processed[];

interface ClientJSIncoming {
    input: ClientJSIncomingType;
    options: Options;
}

interface Processed {
    input?: ClientJSIncomingType;
    content: string
    id: string
    via?: string
}

function createOne(ref: string, content: string, via: string): Processed  {
    return {
        input: content,
        id: `Browsersync ClientJS (${ref})`,
        content: `/**
 * Browsersync ClientJS (${ref})
 * VIA: ${via}
 */
${content}
/**
 * ---- ClientJS END (${ref}) -----
 */`
    }
}

function processIncoming(input: ClientJSIncomingType): Processed[] {
    return [].concat(input)
        .filter(Boolean)
        .map((input, index) : Processed => {
            if (typeof input === 'string') {
                return createOne(String(index), input, 'User Provided (options)');
            }
            if (input.content) {
                return createOne(input.id || String(index), input.content, input.via);
            }
            return input;
        })
}

function createMiddleware(incoming: ClientJSIncoming): Middleware[] {

    const {options} = incoming;
    
    const coreJS = [
        {
            id: 'bs-no-conflict',
            content: 'window.___browserSync___oldSocketIo = window.io;',
            via: 'Browsersync Core'
        },
        {
            id: 'bs-socket-connector',
            content: socketConnector(incoming.options),
            via: 'Browsersync Core'
        },
        {
            id: 'browser-sync-client',
            content: readFileSync(client.mainDist, 'utf8'),
            via: 'Browsersync Core'
        },
    ];

    const joined = (function() {            
        if (options.getIn(['socket', 'enabled'])) {
            return coreJS;
        }
        return [];
    })();

    // console.log(incoming.options.get('clientJS'));
    // const joined = coreJS.concat(incoming.input);
    const js = processIncoming(joined);
    const userjs = processIncoming(options.get('clientJS').toJS());
    const output = [...js, ...userjs].map(x => x.content).join(';\n\n\n');

    return [{
        id: 'Browsersync ClientJS',
        route: '/bs.js',
        handle: (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(output);
        }
    }]
}

export default function ClientJS(address: string, context: IActorContext) {

    return {
        postStart() {
            debug('-> postStart()');
        },
        methods: {
            init: function (stream: IRespondableStream) {
                return stream.flatMap(({payload, respond}) => {
                    const mw = createMiddleware(payload);
                    return Observable.of(respond({mw}));
                });
            }
        }
    }
}
