import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";
import {WatcherMessages} from "../Watcher/Watcher";
import {WatcherAddItems, WatcherNamespace} from "../Watcher/AddItems.message";
import {next} from "@kwonoj/rxjs-testscheduler-compat";
import {CoreChildren, Methods} from "../../Browsersync";
import {join, parse, ParsedPath} from "path";
import {getDirs$} from "../../utils";
import {existsSync} from "fs";
import {DirsGet, DirsMesages} from "../dirs";
import {ServeStaticMiddleware, SSMesagges} from "../ServeStatic/ServeStatic";
import {ServerAddMiddleware} from "../Server/AddMiddleware.message";

const debug = require('debug')('bs:ProxiedFiles');

const {of, empty} = Observable;

export enum ProxiedFilesMessages {
    Init = 'Init',
    AddFile = 'AddFile',
    Stop = 'Stop',
}

export namespace ProxiedFilesAdd {
    export type Input = { path: string };
    export type Response = [null, boolean];
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
                    .buffer(stream.debounceTime(500, context.timeScheduler))
                    .do(xs => debug('buffered', xs.length, ProxiedFilesMessages.AddFile, 'messages'))
                    .concatMap((items) => {
                        const last = items[items.length-1];
                        const {respond, state} = last;

                        // todo - pass CWD through options
                        const dirsPayload = DirsGet.create(join(process.cwd()), process.cwd());
                        const cwd$ = Observable.of(process.cwd());
                        const dirsActor = context.actorSelection(`/system/core/${CoreChildren.Dirs}`)[0];
                        const ssActor = context.actorSelection(`/system/core/serveStatic`)[0];
                        const serverActor = context.actorSelection(`/system/core/server`)[0];

                        // todo - allow the user to disable/enable this.
                        const matchFile = true;

                        return dirsActor.ask(dirsPayload[0], dirsPayload[1]).map(([, dirs]) => dirs)
                            .withLatestFrom(cwd$)
                            .flatMap(([dirs, cwd]) => {
                                return Observable.from(items)
                                    .distinct(({payload}) => payload.path)
                                    .pluck('payload')
                                    .map((x: ProxiedFilesAdd.Input) => ({input: x.path, path: parse(x.path)}))
                                    .flatMap(({input, path}) => {
                                        return Observable.from(<Array<string>>[cwd, ...dirs])
                                            .flatMap(dir => {
                                                if (matchFile) {
                                                    return of({ // full path to file
                                                        dir, path, cwd, input,
                                                        dirname: join(dir, path.dir),
                                                        joined: join(dir, path.dir, path.base),
                                                        target: join(dir, path.dir, path.base),
                                                        route: input,
                                                    }, {
                                                        dir, path, cwd, input,
                                                        dirname: join(dir),
                                                        joined: join(dir, path.base),
                                                        target: join(dir, path.base),
                                                        route: input,
                                                    });
                                                }
                                                return of({
                                                    dir, path, cwd, input,
                                                    dirname: join(dir, path.dir),
                                                    joined: join(dir, path.dir, path.base),
                                                    target: join(dir, path.dir),
                                                    route: path.dir
                                                });
                                            })
                                            .filter(x => {
                                                const exists = existsSync(x.joined);
                                                if (exists) {
                                                    debug(`existsSync [${exists}]`, x.joined);
                                                }
                                                return exists;
                                            })
                                            .take(1)
                                    })
                            })
                            .filter(x => {
                                const exists = state.has(`${x.input}:${x.target}`);
                                if (exists) {
                                    debug('--- skipping', `${x.input}:${x.target}`);
                                    return false;
                                }
                                return true;
                            })
                            // .do(x => console.log(`${x.input}:${x.target}`))
                            .distinctUntilChanged((a, b) => {
                                return a.route === b.route
                                    && a.target === b.target;
                            })
                            .do(x => {
                                debug('+++MATCH+++ possible Serve Static option...');
                                debug({
                                    route: x.route,
                                    dir: x.target
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
                            .flatMap(([item, mws]) => {
                                const mwPayload = ServerAddMiddleware.create(mws);
                                return serverActor.ask(mwPayload[0], mwPayload[1])
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
