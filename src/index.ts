import {Observable} from 'rxjs';
import * as actorJS from 'aktor-js';
import serveStatic from './plugins/serveStatic';
import server, {IServerOptions, Middleware} from './plugins/server';

const {createSystem} = actorJS;

export interface BSCommonOptions {
    cwd: string;
    string: boolean;
}

const pluginWhitelist = {
    'serveStatic': serveStatic,
    'server': server
};

const order = ['serveStatic'];

export default function init(options: object) {

    const system = createSystem();
    const httpServer = system.actorOf(server, 'server');

    const setupActors = order.map(name => {
        if (options[name]) {
            return {
                name,
                input: options[name],
                factory: pluginWhitelist[name],
            }
        }
        return null;
    }).filter(Boolean);

    const commonOptions = {
        cwd: process.cwd()
    }
    
    function createPayload(input = {}) {
        return {
            options: commonOptions,
            input
        }
    }

    Observable
        .from(setupActors)
        .flatMap(x => {
            return system
                .actorOf(x.factory, x.name)
                .ask({
                    type: 'init',
                    payload: createPayload(x.input)
                });
        })
        .pluck('mw')
        .reduce((acc: Middleware[], item: Middleware) => acc.concat(item), [])
        .flatMap(middleware => {

            const opts: IServerOptions = {
                middleware: middleware,
                ...options['server']
            };

            return httpServer.ask({
                type: 'init',
                payload: opts
            });
        })
        // .flatMap(actor => actor.ask({type: 'init'}))
        // .toArray()
        .subscribe(x => {
            console.log(x);
        })
}
