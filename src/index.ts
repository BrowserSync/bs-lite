import {Observable} from 'rxjs';
import * as actorJS from 'aktor-js';
import serveStatic from './plugins/serveStatic';
import server, {IServerOptions, Middleware} from './plugins/server';
import clientJS from './plugins/clientJS';
import compression from './plugins/compression';

const {createSystem} = actorJS;

export interface BSCommonOptions {
    cwd: string;
    string: boolean;
}

const pluginWhitelist = {
    'serveStatic': serveStatic,
    'server': server,
    'clientJS': clientJS,
    'compression': compression
};

const corePlugins = [
    'compression',
    'clientJS',
];

const order = [
    'serveStatic'
];

function getActors(order, options) {
    return order.map(name => {
        return {
            name,
            input: options[name],
            factory: pluginWhitelist[name],
        }
    }).filter(Boolean);
}

export default function init(options: object) {

    const system = createSystem();
    const httpServer = system.actorOf(server, 'server');

    const coreActors = getActors(corePlugins, options);
    const setupActors = getActors(order, options);

    const commonOptions = {
        cwd: process.cwd(),
        compression: true
    };
    
    function createPayload(input?) {
        return {
            options: commonOptions,
            input
        }
    }

    Observable
        .from([...coreActors, ...setupActors])
        .flatMap(x => {
            return system
                .actorOf(x.factory, x.name)
                .ask('init', createPayload(x.input));
        })
        .pluck('mw')
        .reduce((acc: Middleware[], item: Middleware) => acc.concat(item), [])
        .do((x: any[]) => console.log('processed', x.length, 'actors'))
        .flatMap(middleware => {

            const opts: IServerOptions = {
                middleware: middleware,
                ...options['server']
            };

            return httpServer.ask('init', opts);
        })
        .subscribe(x => {
            console.log(x);
        });
}
