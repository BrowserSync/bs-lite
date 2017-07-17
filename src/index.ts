import {Observable} from 'rxjs';
import * as actorJS from 'aktor-js';
import serveStatic from './plugins/serveStatic';
import server, {IServerOptions, Middleware, MiddlewareResponse} from './plugins/server';
import clientJS from './plugins/clientJS';
import compression from './plugins/compression';
import {fromJS, Map} from "immutable";
import {BsOptions, defaultOptions} from "./options";
import {getPorts, portsActorFactory} from "./ports";

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
    const ports = system.actorOf(portsActorFactory, 'ports');

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
        .reduce((acc: Options, item: MiddlewareResponse) => {
            if (item.mw.length) {
                return acc.update('middleware', mw => mw.concat(item.mw))
                    .mergeDeep(item.options || {});
            }
        }, commonOptions)
        .flatMap(options => {

            const input = {
                middleware: options.get('middleware').toJS(),
            };

            return ports
                .ask('init', {options: options})
                .flatMap(ports => {
                    const mergedoptions = options.mergeDeep(fromJS(ports));
                    return httpServer.ask('init', {input, options: mergedoptions});
                })
        })
        .subscribe(x => {
            console.log(x);
        });
}
