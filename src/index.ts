import {Observable} from 'rxjs';
import * as actorJS from 'aktor-js';
import serveStatic from './plugins/serveStatic';
import server, {IServerOptions, Middleware} from './plugins/server';
import clientJS from './plugins/clientJS';
import compression from './plugins/compression';
import {fromJS, Map} from "immutable";
import {BsOptions, defaultOptions} from "./options";

const {createSystem} = actorJS;


export type Options = Map<keyof BsOptions, any>

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

    const commonOptions = fromJS(defaultOptions)
        .mergeDeep(options)
        .mergeDeep({
            cwd: process.cwd(),
        });

    const coreActors = getActors(corePlugins, options);
    const setupActors = getActors(order, options);

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

            const input = {
                middleware: middleware,
            }

            return httpServer.ask('init', {input, options: commonOptions});
        })
        .subscribe(x => {
            console.log(x);
        });
}
