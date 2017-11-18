import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Options} from "../index";
import {parse, ParsedPath} from "path";
import {Middleware, MiddlewareTypes} from "./Server/Server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {isPojo, normPath} from "../utils";
import {BSError, BSErrorType, BSErrorLevel} from "../errors";
import {ServedFilesFile, ServedFilesMessages} from "./ServedFiles/ServedFiles";

const debug = require('debug')('bs:serveStatic');

export type SSIncomingType = string|string[]|SSIncomingObject|SSIncomingObject[];

export enum SSMesagges {
    Middleware = 'middleware'
}

export namespace ServeStaticMiddleware {
    export type Input = {
        cwd: string
        options: SSIncomingType
    };
    export type Response = [null|BSError[], null|Middleware[]];
}

export function ServeStatic (address: string, context: IActorContext) {
    const served = context.actorSelection('/system/core/servedFiles')[0];
    return {
        postStart() {
            debug('-> postStart()');
        },
        methods: {
            [SSMesagges.Middleware]: function (stream: IMethodStream<ServeStaticMiddleware.Input, ServeStaticMiddleware.Response, any>) {
                return stream.map(({payload, respond}) => {
                    const {cwd, options} = payload;
                    const [errors, mw] = createMiddleware(options, cwd, {
                        onFile: (path, stat) => {
                            const payload: ServedFilesFile.Input = {
                                cwd, path
                            };
                            served.tell(ServedFilesMessages.File, payload).subscribe();
                        }
                    });
                    if (errors.length) {
                        return respond([errors, null]);
                    }
                    return respond([null, mw]);
                });
            },
        },
    }
}

export interface SSOptions {
    onFile(path:string, stat: any): void
}

export interface SSIncomingObject {
    id?: string
    dir?: string|string[];
    route?: string|string[];
    options?: SSOptions
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
    errors: Error[]
    options: SSOptions,
}


/**
 * Serve static options:
 *
 *  eg: serveStatic: ['src']
 *  eg: serveStatic: 'app'
 */
export function processIncoming(input: SSIncomingType, cwd: string, options: SSOptions): Processed[] {
    return [].concat(input)
        .map((input, index) : Processed => {
            const id = `serve-static-${index}`;
            if (typeof input === 'string') {
                return {
                    id,
                    input,
                    dirs: [createDir(input, cwd)],
                    routes: [''],
                    errors: [],
                    options,
                }
            }
            if (isPojo(input)) {
                return fromObject(input, id, cwd, options);
            }
            return {
                id,
                input,
                dirs: [],
                routes: [],
                errors: [new Error(`Unsupported Type '${typeof input}'`)],
                options,
            }
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

function fromObject(incoming: SSIncomingObject, id: string, cwd, options: SSOptions): Processed {
    const dirs = [].concat(incoming.dir)
        .filter(Boolean)
        .map(d => createDir(d, cwd));

    const routes = (() => {
        const routes = [].concat(incoming.route).filter(Boolean);
        if (routes.length) return routes;
        return ['/']
    })();

    return {
        input: incoming,
        dirs,
        routes,
        errors: [],
        id,
        options: {
            ...options,
            ...incoming.options
        },
    }
}

function createMiddleware(options: SSIncomingType, cwd: string, ssOpts: SSOptions): [BSError[], Middleware[]] {

    const processed = processIncoming(options, cwd, ssOpts);

    const withErrors = processed.filter(x => x.errors.length || x.dirs.some(dir => dir.errors.length > 0));
    const withoutErrors = processed.filter(x => x.errors.length === 0 && x.dirs.every(dir => dir.errors.length === 0));

    const bsErrors = withErrors.reduce((acc, item) => {
        const errors = item.errors.length
            ? item.errors
            : item.dirs.reduce((acc, x) => acc.concat(x.errors), []);

        if (errors.length) {
            const outgoingError: BSError = {
                type: BSErrorType.ServeStaticInput,
                level: BSErrorLevel.Warn,
                errors: errors.map(e => ({error: e}))
            };
            return acc.concat(outgoingError);
        }
        return acc;
    }, []);

    const mw = withoutErrors
        .reduce((acc, item: Processed, index): Middleware[] => {
            return acc.concat(item.routes.reduce((acc, route, routeIndex): Middleware[] => {
                return acc.concat(item.dirs.map((dir, dirIndex): Middleware => {
                    return {
                        id: `Serve Static (${index}-${routeIndex}-${dirIndex})`,
                        route,
                        type: MiddlewareTypes.serveStatic,
                        handle: require('serve-static')(dir.resolved, item.options)
                    }
                }));
            }, []));
        }, []);

    return [bsErrors, mw];
}

export default ServeStatic;
