import {Observable} from 'rxjs';
import * as actorJS from 'aktor-js';
import serveStatic from './plugins/serveStatic';
import server, {IServerOptions, Middleware} from './plugins/server';

const {createSystem} = actorJS;

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
                options: options[name],
                factory: pluginWhitelist[name],
            }
        }
        return null;
    }).filter(Boolean);

    Observable
        .from(setupActors)
        .flatMap(x => {
            return system
                .actorOf(x.factory, x.name)
                .ask({type: 'init', payload: x.options});
        })
        .pluck('mw')
        .reduce((acc: Middleware[], item: Middleware) => acc.concat(item), [])
        .flatMap(middleware => {
            return httpServer.ask({
                type: 'init',
                payload: <IServerOptions>{
                    middleware: middleware,
                    ...options['server']
                }
            });
        })
        // .flatMap(actor => actor.ask({type: 'init'}))
        // .toArray()
        .subscribe(x => {
            console.log(x);
        })
}
