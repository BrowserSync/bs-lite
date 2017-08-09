import {Observable, BehaviorSubject} from 'rxjs';
import serveStatic from './plugins/serveStatic';
import {IServerOptions, Middleware, MiddlewareResponse, ServerInit, ServerMessages} from './plugins/server';
import clientJS from './plugins/clientJS';
import compression from './plugins/compression';
import {fromJS, Map} from "immutable";
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Options} from "./index";
import {BrowsersyncInitOutput, BrowsersyncInitResponse} from "./Browsersync";
import {RespModifier} from "./resp-modifier";
import {addMissingOptions} from "./options";
import {clientScript, scriptTags} from "./connect-utils";
import {BrowsersyncProxy} from "./plugins/proxy";

const debug = require('debug')('bs:system');

const pluginWhitelist = {
    'serveStatic': serveStatic,
    'clientJS': clientJS,
    'compression': compression,
    'proxy': BrowsersyncProxy,
    'rewriteRules': RespModifier,
};

const corePlugins = [
    'compression',
    'proxy',
    'clientJS',
    'rewriteRules',
];

const optionals = [
    'serveStatic',
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

function _getActor(context) {
    return (name, factory) => {
        const current = context.actorSelection(name);

        const actor = current.length
            ? current[0]
            : context.actorOf(factory, name);

        return actor;
    }
}

export function createWithOptions(context: IActorContext, options: Options): Observable<BrowsersyncInitOutput> {

    const getActor = _getActor(context);
    const server   = context.actorSelection('server')[0];
    const opts     = addMissingOptions(options);

    return Observable.zip<any>(
        getActor('proxy', BrowsersyncProxy).ask('options', opts.get('proxy')),
        ((proxyResp) => {
            return opts.updateIn(['rewriteRules'], prev => {
                if (proxyResp.rewriteRules.length) {
                    return prev.concat(fromJS(proxyResp.rewriteRules));
                }
                return prev;
            });
        })
    )
    .flatMap(opts => {
        return Observable.zip(
            Observable.zip(
                getActor('compression', compression).ask('middleware', opts.get('compression')),
                getActor('clientJS', clientJS).ask('middleware', opts),
                getActor('proxy', BrowsersyncProxy).ask('middleware', opts.get('proxy')),
            ).map(mws => mws.reduce((acc: Middleware[], item: Middleware[]) => acc.concat(item), [])),
            Observable.of(opts)
        )
    })
    .flatMap(([middleware, options]) => {
        const payload = {middleware, options};
        return server
            .ask(ServerMessages.Init, payload)
            .flatMap((resp: ServerInit.Response) => {
                if (resp.errors.length) {
                    return Observable.throw(resp.errors[0]);
                }
                const output: BrowsersyncInitOutput = {server: resp.server, options};
                return Observable.of(output);
            });
    });
}


