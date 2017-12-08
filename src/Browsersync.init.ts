import {Observable} from 'rxjs';
import serveStatic, {ServeStaticMiddleware} from './plugins/ServeStatic/serveStatic';
import {Middleware} from './plugins/Server/Server';
import clientJS from './plugins/ClientJS/clientJS';
import compression, {CompressionMiddleware} from './plugins/compression';
import {fromJS, Map, List} from "immutable";
import {Options} from "./index";
import {RespModifier, RespModifierMiddlewareInput} from "./resp-modifier";
import {addMissingOptions, BsOptions} from "./options";
import {askForProxyMiddleware, getProxyOption, askForProxyOptions} from "./plugins/Proxy/proxy";
import {RewriteRule} from "./rewrite-rules";
import {ActorRef, IActorContext} from "aktor-js";
import {ProxyOptions} from "./plugins/Proxy/Options.message";

const debug = require('debug')('bs:system');
const {of} = Observable;

export type GetActorFn = (name: string, factory: Function) => ActorRef;
function _getActor(context): GetActorFn {
    return (name, factory) => {
        const current = context.actorSelection(name);

        const actor = current.length
            ? current[0]
            : context.actorOf(factory, name);

        return actor;
    }
}

export function getOptionsAndMiddleware(context: IActorContext, options: Options): Observable<{middleware: Middleware[], options: Options}> {

    const getActor    = _getActor(context);
    const opts        = addMissingOptions(options);
    const proxyOption = getProxyOption(opts.get('proxy'));
    const proxyActor  = askForProxyOptions(getActor, proxyOption);

    return of(opts).flatMap((opts) => {
        if (!proxyOption.length) {
            return of(opts);
        }
        return proxyActor.flatMap((proxyResp: ProxyOptions.Response) => {
            const [errors, optsFromProxy] = proxyResp;
            if (errors && errors.length) {
                return Observable.throw(errors);
            }
            const updatedOptions = opts
                .updateIn(['rewriteRules'], prev => {
                    if (optsFromProxy.rewriteRules.length) {
                        return prev.concat(fromJS(optsFromProxy.rewriteRules));
                    }
                    return prev;
                })
                .update('scheme', scheme => {
                    if (optsFromProxy.scheme === 'https') {
                        return optsFromProxy.scheme;
                    }
                    return scheme;
                });
            return of(updatedOptions);
        })
    })
    .flatMap((opts: Options): any => {

        const snippetRule: RewriteRule = opts.getIn(['snippetOptions', 'rewriteRule']).toJS();
        const optionRules = opts.get('rewriteRules').toJS().filter(Boolean);

        const rules = [snippetRule, ...optionRules];

        const respInput: RespModifierMiddlewareInput = {
            rules,
            options: opts,
        };

        const ssInput = ServeStaticMiddleware.create(opts.get('cwd'), serialise(opts.get('serveStatic')));
        const compressionMw = CompressionMiddleware.create(opts.get('compression') as boolean);
        const proxyOption = getProxyOption(opts.get('proxy'));
        const proxyMiddleware = askForProxyMiddleware(getActor, proxyOption);

        const combinedMw = Observable.zip(
            getActor('compression', compression).ask(compressionMw[0], compressionMw[1]),
            getActor('clientJS', clientJS).ask('middleware', opts),
            getActor('resp-mod', RespModifier).ask('middleware', respInput),
            getActor('serveStatic', serveStatic).ask(ssInput[0], ssInput[1]).flatMap(throwForErrors),
            proxyMiddleware.flatMap(throwForErrors),
        )
            .map((mws: any[]) => {
                return mws.reduce((acc: Middleware[], item: Middleware[]) => acc.concat(item), [])
            });

        return Observable.zip(
            combinedMw,
            Observable.of(opts),
            (middleware, options) => {
                return {
                    middleware,
                    options
                }
            }
        )
    })
}

function throwForErrors([errors, output]) {
    if (errors && errors.length) {
        return Observable.throw(errors);
    }
    return of(output);
}


function serialise(input) {
    if (Map.isMap(input) || List.isList(input)) {
        return input.toJS();
    }
    return input;
}
