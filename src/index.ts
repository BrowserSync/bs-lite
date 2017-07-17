import {Observable, BehaviorSubject} from 'rxjs';
import * as actorJS from 'aktor-js';
import serveStatic from './plugins/serveStatic';
import server, {IServerOptions, Middleware, MiddlewareResponse} from './plugins/server';
import clientJS from './plugins/clientJS';
import compression from './plugins/compression';
import {fromJS, Map} from "immutable";
import {BsOptions, defaultOptions} from "./options";
import {getPorts, portsActorFactory} from "./ports";
const debug = require('debug')('bs:system');

const {createSystem} = actorJS;


export type Options = Map<keyof BsOptions, any>

const pluginWhitelist = {
    'serveStatic': serveStatic,
    'server': server,
    'clientJS': clientJS,
    'compression': compression,
    'ports': portsActorFactory
};

const corePlugins = [
    'compression',
    'clientJS',
    'ports',
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
        .subscribe(x => {
            setTimeout(() => {
                createWithOptions(system, bsoptions.getValue().setIn(['server', 'port'], 9001))
                    .subscribe(([server, options]) => {
                        console.log(options.toJS());
                    }, err => console.log(err));
            }, 1000);
        }, (err) => {
            console.error('Error in setup', err);
        });


}

function createWithOptions(system, options: Options) {

    const coreActors = getActors(corePlugins, options);
    const setupActors = getActors(order, options);

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
                    if (resp.mw.length) {
                        return options.update('middleware', mw => mw.concat(resp.mw))
                            .mergeDeep(fromJS(resp.options) || {});
                    }
                    return options.mergeDeep(fromJS(resp.options) || {});
                })
                .catch(err => {
                    console.error(err);
                    return Observable.empty();
                })
        })
        .do(x => opts.next(x))
        .last()
        .flatMap(options => {

            // console.log(options.toJS());
            const current = opts.getValue();

            const input = {
                middleware: current.get('middleware').toJS(),
            };

            const existing = system.actorSelection('server');
            const actor = existing.length
                ? existing[0]
                : system.actorOf(server, 'server');


            return actor.ask('init', {input, options: current})
                .map(server => {
                    return [server, options];
                })
        })
}