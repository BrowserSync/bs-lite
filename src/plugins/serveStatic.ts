import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Options} from "../index";
import {join, parse, ParsedPath} from "path";
import {Middleware, MiddlewareResponse} from "./server";
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
import {normPath, Right} from "../utils";
const debug = require('debug')('bs:serveStatic');

export type SSIncomingType = string|string[]|SSIncomingObject|SSIncomingObject[];

export interface SSIncomingObject {
    id?: string
    dir?: string|string[];
    route?: string|string[];
}

export interface SSDir {
    userInput: string;
    parsed: ParsedPath|null;
    resolved: string|null;
    errors: Error[];
}

export interface Processed {
    input: SSIncomingType,
    id: string,
    dirs: SSDir[]
    routes: string[]
}

/**
 * Serve static options:
 *
 *  eg: serveStatic: ['src']
 *  eg: serveStatic: 'app'
 */
export function processIncoming(input: string|string[], options: Options): Processed[] {
    return [].concat(input)
        .map((input, index) : Processed => {
            const id = `serve-static-${index}`;
            if (typeof input === 'string') {
                return {
                    id,
                    input,
                    dirs: [createDir(input, options.get('cwd'))],
                    routes: [''],
                }
            }
            return fromObject(input, id, options.get('cwd'));
        })
}

function createDir(dir: string, cwd): SSDir {
    return normPath(dir, cwd)
        .fold((err): SSDir => {
            return {
                userInput: dir,
                errors: [err],
                parsed: null,
                resolved: null
            }
        }, (path): SSDir => {
            return {
                userInput: dir,
                errors: [],
                resolved: path,
                parsed: parse(path)
            }
        })
}

function fromObject(incoming: SSIncomingObject, id: string, cwd): Processed {
    const dirs = [].concat(incoming.dir)
        .filter(Boolean)
        .map(d => createDir(d, cwd));

    const routes = [].concat(incoming.route).filter(Boolean);

    return {
        input: incoming,
        dirs,
        routes,
        id,
    }
}

function createMiddleware(options: Options): Middleware[] {

    const optionItems = options.get('serveStatic').toJS();
    const processed = processIncoming(optionItems, options);
    const withErrors = processed.filter(x => x.dirs.some(dir => dir.errors.length > 0));
    const withoutErrors = processed.filter(x => x.dirs.every(dir => dir.errors.length === 0));

    const mw = withoutErrors
        .reduce((acc, item: Processed, index): Middleware[] => {
            return acc.concat(item.routes.reduce((acc, route, routeIndex): Middleware[] => {
                return acc.concat(item.dirs.map((dir, dirIndex): Middleware => {
                    return {
                        id: `Serve Static (${index}-${routeIndex}-${dirIndex})`,
                        route,
                        handle: require('serve-static')(dir.resolved)
                    }
                }));
            }, []));
        }, []);

    return mw;
}

export function ServeStatic (address: string, context: IActorContext) {

    return {
        postStart() {
            debug('-> postStart()');
        },
        methods: {
            init: function (stream: IRespondableStream): Observable<MiddlewareResponse> {
                return stream.flatMap(({payload, respond}) => {
                    const mw = createMiddleware(payload);
                    return Observable.of(respond({mw}));
                })
            }
        },
    }
}

export default ServeStatic;
