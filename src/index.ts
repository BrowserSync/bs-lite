import {Observable, BehaviorSubject} from 'rxjs';
import * as actorJS from 'aktor-js';
import serveStatic from './plugins/serveStatic';
import {IServerOptions, Middleware, MiddlewareResponse} from './plugins/server';
import clientJS from './plugins/clientJS';
import compression from './plugins/compression';
import {fromJS, Map} from "immutable";
import {BsOptions, defaultOptions} from "./options";
import {getPorts, portsActorFactory} from "./ports";
import Server from "./plugins/server";
const debug = require('debug')('bs:system');

const {createSystem} = actorJS;


export type Options = Map<keyof BsOptions, any>

const pluginWhitelist = {
    'serveStatic': serveStatic,
    'server': Server,
    'clientJS': clientJS,
    'compression': compression,
    'ports': portsActorFactory
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
    const serverActor = system.actorOf(Server, 'server');

    const commonOptions = fromJS(defaultOptions)
        .mergeDeep(options)
        .mergeDeep({
            cwd: process.cwd(),
        });

    const bsoptions = new BehaviorSubject(commonOptions);
    const serverInfo = new BehaviorSubject({});

    createWithOptions(system, commonOptions)
        .do(([server, options]) => {
            bsoptions.next(options);
            serverInfo.next(server);
        })
        .subscribe(([server, options]) => {
            setTimeout(() => {
                createWithOptions(system, bsoptions.getValue().update('serveStatic', ss => ss.concat('src')))
                    .subscribe(([server, options]) => {
                        console.log('SECOND ->', server);
                        setTimeout(() => {
                            createWithOptions(system, bsoptions.getValue().update('serveStatic', ss => {
                                return ss.filter(x => x !== 'src');
                            }))
                                .subscribe(([server, options]) => {
                                    console.log('3rd ->', server);
                                }, err => console.log(err));
                        }, 5000);
                    }, err => console.log(err));
            }, 1000);
            console.log('FIRST ->', server);
        }, (err) => {
            console.error('Error in setup', err);
        });
}

function createWithOptions(system, options: Options) {

    const coreActors = getActors(corePlugins, options);
    const setupActors = getActors(order, options);
    const server = system.actorSelection('server')[0];

    function createPayload(input, options) {
        return {
            options,
            input
        }
    }

    const opts = new BehaviorSubject(options);

    return Observable
        .from([...coreActors, ...setupActors])
        .do(x => debug(`++ incoming actor (${x.name})`))
        .concatMap((item) => {

            const options = opts.getValue();
            const current = system.actorSelection(item.name);

            const actor = current.length
                ? current[0]
                : system.actorOf(item.factory, item.name);

            return actor
                .ask('init', createPayload(item.input, options))
                .map((resp: MiddlewareResponse) => {
                    opts.next(options.mergeDeep(fromJS(resp.options) || {}));
                    return resp.mw || [];
                })
                .catch(err => {
                    console.error(err);
                    return Observable.empty();
                })
        })
        .reduce((acc: Middleware[], mw: Middleware[]) => {
            return acc.concat(mw);
        }, [])
        .flatMap((middleware: Middleware[]) => {

            const current = opts.getValue();

            const payload = {
                input: {
                    middleware,
                },
                options: current,
            };

            return server
                .ask('init', payload)
                .map(server => {
                    return [server, options];
                });
        })
}