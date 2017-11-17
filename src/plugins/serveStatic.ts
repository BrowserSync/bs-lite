import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Options} from "../index";
import {parse, ParsedPath} from "path";
import {Middleware, MiddlewareTypes} from "./Server/Server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {isPojo, normPath} from "../utils";
import {BSError, BSErrorType, BSErrorLevel} from "../errors";
const debug = require('debug')('bs:serveStatic');

export type SSIncomingType = string|string[]|SSIncomingObject|SSIncomingObject[];

export enum SSMesagges {
    Middleware = 'middleware',
    Validate = 'validate'
}

export interface SSMiddlewarePayload {
    cwd: string
    options: SSIncomingType
}

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
    errors: Error[]
}

/**
 * Serve static options:
 *
 *  eg: serveStatic: ['src']
 *  eg: serveStatic: 'app'
 */
export function processIncoming(input: SSIncomingType, cwd: string): Processed[] {
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
                }
            }
            if (isPojo(input)) {
                return fromObject(input, id, cwd);
            }
            return {
                id,
                input,
                dirs: [],
                routes: [],
                errors: [new Error(`Unsuported Type '${typeof input}'`)]
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

function fromObject(incoming: SSIncomingObject, id: string, cwd): Processed {
    const dirs = [].concat(incoming.dir)
        .filter(Boolean)
        .map(d => createDir(d, cwd));

    const routes = [].concat(incoming.route).filter(Boolean);

    return {
        input: incoming,
        dirs,
        routes,
        errors: [],
        id,
    }
}

function createMiddleware(options: SSIncomingType, cwd: string): [BSError[], Middleware[]] {

    const processed = processIncoming(options, cwd);

    const withErrors = processed.filter(x => x.errors.length || x.dirs.some(dir => dir.errors.length > 0));
    const withoutErrors = processed.filter(x => x.errors.length === 0 && x.dirs.every(dir => dir.errors.length === 0));

    // todo propagate these errors to allow strict mode to fail
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
                        handle: require('serve-static')(dir.resolved)
                    }
                }));
            }, []));
        }, []);

    return [bsErrors, mw];
}

export namespace ServeStatic {
    export type Response = [null|BSError[], null|Middleware[]];
}

export function ServeStatic (address: string, context: IActorContext) {

    return {
        postStart() {
            debug('-> postStart()');
        },
        methods: {
            [SSMesagges.Middleware]: function (stream: IMethodStream<SSMiddlewarePayload, ServeStatic.Response, any>) {
                return stream.map(({payload, respond}) => {
                    const {cwd, options} = payload;
                    const [errors, mw] = createMiddleware(options, cwd);
                    if (errors.length) {
                        return respond([errors, null]);
                    }
                    return respond([null, mw]);
                });
            },
        },
    }
}

export default ServeStatic;
