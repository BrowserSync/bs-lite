import {parse, ParsedPath} from "path";
import {SSIncomingObject, SSIncomingType} from "./ServeStatic";
import {isPojo, normPath} from "../../utils";
import {BSError, BSErrorLevel, BSErrorType} from "../../errors";
import {Middleware, MiddlewareTypes} from "../Server/Server";

export interface SSOptions {
    onFile(path:string, stat: any): void
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

export function createMiddleware(options: SSIncomingType, cwd: string, ssOpts: SSOptions): [BSError[], Middleware[]] {

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

export function alreadyCovered(existingItems, incoming) {
    const incomingRoute = incoming.route.split('/').filter(Boolean);
    const incomingDir = incoming.dir.split('/').filter(Boolean);

    return existingItems.some(item => {
        const rs = item.route.split('/').filter(Boolean);
        const ds = item.dir.split('/').filter(Boolean);
        const matchRoute = rs.every((r, index) => {
            return r === incomingRoute[index];
        });
        const matchDir = matchRoute && ds.every((d, index) => {
            return d === incomingDir[index];
        });
        return matchRoute && matchDir;
    });
}