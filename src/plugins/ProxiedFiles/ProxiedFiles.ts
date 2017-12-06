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
                    .flatMap((items) => {
                        const last = items[items.length-1];
                        const {respond, state} = last;

                        // todo - pass CWD through options
                        const dirsPayload = DirsGet.create(join(process.cwd()), process.cwd());
                        const cwd$ = Observable.of(process.cwd());
                        const dirsActor = context.actorSelection(`/system/core/${CoreChildren.Dirs}`)[0];
                        const ssActor = context.actorSelection(`/system/core/serveStatic`)[0];
                        const serverActor = context.actorSelection(`/system/core/server`)[0];

                        return dirsActor.ask(dirsPayload[0], dirsPayload[1]).map(([, dirs]) => dirs)
                            .withLatestFrom(cwd$)
                            .flatMap(([dirs, cwd]) => {
                                return Observable.from(items)
                                    .distinct(({payload}) => payload.path)
                                    .pluck('payload')
                                    .map((x: ProxiedFilesAdd.Input) => parse(x.path))
                                    .flatMap((path) => {
                                        return Observable.from(<Array<string>>[cwd, ...dirs])
                                            .map(dir => {
                                                return {
                                                    dir, path, cwd,
                                                    dirname: join(dir, path.dir),
                                                    joined: join(dir, path.dir, path.base),
                                                }
                                            })
                                            .filter(x => {
                                                const exists = existsSync(x.joined);
                                                debug(`existsSync [${exists}]`, x.joined);
                                                return exists;
                                            })
                                            .take(1)
                                    })
                            })
                            .distinctUntilChanged((a, b) => {
                                return a.path.dir === b.path.dir
                                    && a.dirname === b.dirname;
                            })
                            .do(x => {
                                debug('+++MATCH+++ possible Serve Static option...');
                                debug({
                                    route: x.path.dir,
                                    dir: x.dirname
                                });
                            })
                            .flatMap(item => {
                                const ssInput = ServeStaticMiddleware.create(item.cwd, {
                                    route: item.path.dir, // eg: /some/web-path
                                    dir: item.dirname // eg: src/local/sources
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
                                return acc.add(item.joined);
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
