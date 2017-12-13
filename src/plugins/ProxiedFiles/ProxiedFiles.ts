import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";
import {WatcherMessages} from "../Watcher/Watcher";
import {WatcherAddItems, WatcherNamespace} from "../Watcher/AddItems.message";
import {next} from "@kwonoj/rxjs-testscheduler-compat";
import {CoreChildren, Methods} from "../../Browsersync";
import {isAbsolute, join, parse, ParsedPath} from "path";
import {getDirs$} from "../../utils";
import {existsSync} from "fs";
import {DirsGet, DirsMesages} from "../dirs";
import {ServeStaticMiddleware, SSMesagges} from "../ServeStatic/ServeStatic";
import {ServerAddMiddleware} from "../Server/AddMiddleware.message";
import {ServedFilesAdd} from "../ServedFiles/ServedFiles";
import {FileEvent} from "../Watcher/FileEvent.message";
import {Exists} from "../../Fs/Exists";
import {Middleware} from "../Server/Server";

const debug = require('debug')('bs:ProxiedFiles');

const {of, empty} = Observable;

export enum ProxiedFilesMessages {
    Init = 'Init',
    AddFile = 'AddFile',
    Stop = 'Stop',
}

export namespace ProxiedFilesAdd {
    export interface ProxiedFilesAddOptions {
        matchFile: boolean,
        baseDirectory: string | string[],
    }
    export type Input = { path: string, options: ProxiedFilesAddOptions };
    export interface Result {
        cwd: string,
        input: string,
        absolutePath: string,
        target: string,
        route: string,
    }
    export type Response = [null, boolean];
    export function create(path: string, options?: ProxiedFilesAddOptions): [ProxiedFilesMessages.AddFile, Input] {
        const mergedOptions: ProxiedFilesAddOptions = {
            matchFile: false,
            baseDirectory: [],
            ...options
        };
        return [ProxiedFilesMessages.AddFile, {path, options: mergedOptions}]
    }
}

export namespace ProxiedFilesStop {
    export type Response = [null, string];
}

export namespace ProxiedFilesInit {
    export type Response = [null, string];
}

type ProxiedFilesState = Set<string>;

export function ProxiedFilesFactory(address: string, context: IActorContext): any {
    return {
        initialState: Set([]),
        methods: {
            [ProxiedFilesMessages.AddFile]: function (stream: IMethodStream<ProxiedFilesAdd.Input, ProxiedFilesAdd.Response, ProxiedFilesState>) {
                return stream
                    .buffer(stream.debounceTime(1000, context.timeScheduler))
                    .do(xs => debug('buffered', xs.length, ProxiedFilesMessages.AddFile, 'messages'))
                    .concatMap((items) => {
                        // console.log(items);
                        const last = items[items.length-1];
                        const {respond, state} = last;

                        const options: ProxiedFilesAdd.ProxiedFilesAddOptions = last.payload.options;

                        const bs = context.actorSelection('/system/core')[0];
                        const dirsActor = context.actorSelection(`/system/core/${CoreChildren.Dirs}`)[0];
                        const ssActor = context.actorSelection(`/system/core/serveStatic`)[0];
                        const serverActor = context.actorSelection(`/system/core/server`)[0];
                        const servedFilesActor = context.actorSelection(`/system/core/servedFiles`)[0];
                        const exists = context.actorSelection(`/system/core/exists`)[0];

                        return bs.ask(Methods.GetOption, ['cwd']).map(([,cwd]) => cwd)
                            .flatMap((cwd) => {

                                const baseDir = [].concat(options.baseDirectory)
                                    .map(x => isAbsolute(x) ? x : join(cwd, x))
                                    .filter(Boolean)[0];

                                const dirsPayload = DirsGet.create(baseDir || cwd, cwd);
                                return dirsActor.ask(dirsPayload[0], dirsPayload[1]).map(([, dirs]) => dirs)
                                    .flatMap((dirs) => {
                                        return Observable.from(items)
                                            .distinct(({payload}) => payload.path)
                                            .pluck('payload')
                                            .map((x: ProxiedFilesAdd.Input) => ({item: x, parsedPath: parse(x.path)}))
                                            .concatMap(({item, parsedPath}) => {
                                                const input = item.path;
                                                const options: ProxiedFilesAdd.ProxiedFilesAddOptions = item.options;
                                                const dirsToCheck = baseDir ? [baseDir, ...dirs] : [cwd, ...dirs];
                                                return Observable.from(<Array<string>>dirsToCheck)
                                                    .flatMap((dir): Observable<ProxiedFilesAdd.Result> => {

                                                        const absoluteFilepath = join(dir, parsedPath.dir, parsedPath.base);
                                                        const absoluteDirPath = join(dir, parsedPath.base);

                                                        if (options.matchFile) {
                                                            return of({ // try the full path to the file along with the regular check
                                                                cwd, input,
                                                                absolutePath: absoluteFilepath,
                                                                target: join(dir, parsedPath.dir, parsedPath.base),
                                                                route: input,
                                                            }, {
                                                                cwd, input,
                                                                absolutePath: absoluteDirPath,
                                                                target: join(dir, parsedPath.base),
                                                                route: input,
                                                            });
                                                        }
                                                        return of({
                                                            cwd, input,
                                                            absolutePath: absoluteFilepath,
                                                            target: join(dir, parsedPath.dir),
                                                            route: parsedPath.dir
                                                        });
                                                    })
                                                    .concatMap((item: ProxiedFilesAdd.Result) => {
                                                        const payload = Exists.create(item.absolutePath);
                                                        return exists.ask(payload[0], payload[1])
                                                            .flatMap((result) => {
                                                                if (result) {
                                                                    return of(item);
                                                                }
                                                                return empty();
                                                            });
                                                    })
                                                    .take(1)
                                            })
                                    })
                                    .filter(item => {
                                        const exists = state.has(`${item.input}:${item.target}`);
                                        if (exists) {
                                            debug('--- skipping', `${item.input}:${item.target}`);
                                            return false;
                                        }
                                        return true;
                                    })
                                    // .do(x => console.log(`${x.input}:${x.target}`))
                                    .distinctUntilChanged((a, b) => {
                                        return a.route === b.route
                                            && a.target === b.target;
                                    })
                                    .do(item => {
                                        debug('+++MATCH+++ possible Serve Static option...');
                                        debug({
                                            route: item.route,
                                            dir: item.target
                                        });
                                    })
                                    .flatMap(item => {
                                        const ssInput = ServeStaticMiddleware.create(item.cwd, {
                                            route: item.route, // eg: /some/web-path
                                            dir: item.target // eg: src/local/sources
                                        });
                                        return ssActor.ask(ssInput[0], ssInput[1])
                                            .flatMap((resp: ServeStaticMiddleware.Response) => {
                                                const [errors, mws] = resp;
                                                if (errors && errors.length) {
                                                    return empty();
                                                }
                                                return of([item, mws]);
                                            })
                                    })
                                    // .toArray()
                                    .flatMap((incoming) => {
                                        const item: ProxiedFilesAdd.Result = incoming[0];
                                        const mws: Middleware[] = incoming[1];
                                        const mwPayload = ServerAddMiddleware.create(mws);
                                        const servedPayload = ServedFilesAdd.create(item.cwd, item.absolutePath);
                                        return Observable.merge(
                                            serverActor.ask(mwPayload[0], mwPayload[1]),
                                            servedFilesActor.tell(servedPayload[0], servedPayload[1])
                                                .ignoreElements()
                                        )
                                            .mapTo([item, mws])
                                    })
                                    .flatMap((incoming) => {
                                        const item: ProxiedFilesAdd.Result = incoming[0];
                                        const mws: Middleware[] = incoming[1];
                                        const watcher = context.actorSelection('/system/core/watcher')[0];
                                        const fileEvent = FileEvent.create({
                                            event: 'change',
                                            path: item.absolutePath,
                                            parsed: parse(item.absolutePath),
                                            ns: WatcherNamespace.FilesOption
                                        });
                                        return watcher.tell(fileEvent[0], fileEvent[1])
                                            .mapTo([item, mws])
                                    })
                                    .reduce((acc: Set<string>, [item, mws]) => {
                                        return acc.add(`${item.input}:${item.target}`);
                                    }, state)
                                    .map(newState => {
                                        debug('next state...');
                                        debug('->', newState);
                                        return respond([null, true], newState)
                                    })
                                    .catch(err => {
                                        debug('err in processing dirs', err);
                                        return of(respond([null, false], state));
                                    })
                            })
                    })
            },
            [ProxiedFilesMessages.Init]: function (stream: IMethodStream<void, ProxiedFilesInit.Response, ProxiedFilesState>) {
                return stream.map(({respond, state}) => {
                    debug(`init, clearing ${state.size} items`);
                    const nextState = Set([]);
                    return respond([null, 'ok'], nextState);
                })
            }
        }
    }
}
