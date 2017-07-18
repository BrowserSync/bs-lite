import {Observable, BehaviorSubject} from 'rxjs';
import serveStatic from './plugins/serveStatic';
import {IServerOptions, Middleware, MiddlewareResponse} from './plugins/server';
import clientJS from './plugins/clientJS';
import compression from './plugins/compression';
import {fromJS, Map} from "immutable";
import {getPorts, portsActorFactory} from "./ports";
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Options} from "./index";
const debug = require('debug')('bs:system');

const pluginWhitelist = {
    'serveStatic': serveStatic,
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

export function createWithOptions(context: IActorContext, options: Options) {

    const coreActors = getActors(corePlugins, options);
    const setupActors = getActors(order, options);
    const server = context.actorSelection('server')[0];

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
            const current = context.actorSelection(item.name);

            const actor = current.length
                ? current[0]
                : context.actorOf(item.factory, item.name);

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