import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";
import {WatcherMessages} from "../Watcher/Watcher";
import {WatcherAddItems, WatcherNamespace} from "../Watcher/AddItems.message";
import {next} from "@kwonoj/rxjs-testscheduler-compat";
import {CoreChildren, Methods} from "../../Browsersync";
import {join, parse} from "path";
import {getDirs$} from "../../utils";
import {existsSync} from "fs";
import {DirsGet, DirsMesages} from "../dirs";

const debug = require('debug')('bs:ProxiedFiles');

const {of} = Observable;

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
                    .flatMap(({payload, state, respond}) => {
                        if (state.contains(payload.path)) {
                            debug('skipping', payload.path, '(already processed)');
                            return of(respond([null, false], state));
                        }

                        debug(`adding ${payload.path} to proxied files`);
                        const nextState = state.add(payload.path);
                        const paths$ = Observable.of(payload.path).map(x => parse(x));
                        const cwd$ = Observable.of(process.cwd());
                        const dirs = context.actorSelection(`/system/core/${CoreChildren.Dirs}`)[0];

                        const dirsPayload: DirsGet.Input = {
                            target: process.cwd(),
                            cwd: process.cwd(),
                        };

                        // debug(`DirsGet.Input...`);
                        // debug(dirsPayload);

                        return dirs.ask(DirsMesages.Get, dirsPayload).map(([, dirs]) => dirs)
                            .do(xs => debug(`${xs.length} dirs returned`))
                            .flatMap((xs: string[]) => {
                                return Observable.from(xs)
                                    .withLatestFrom(paths$, cwd$)
                                    .map(([dir, path, cwd]) => {
                                        return {
                                            dir, path, cwd,
                                            dirname: join(dir, path.dir),
                                            joined: join(dir, path.dir, path.base),
                                        }
                                    })
                                    .filter(({dir, path, joined}) => existsSync(joined))
                            })
                            .do(x => {
                                debug('+++MATCH+++ possible Serve Static option...');
                                debug({
                                    route: x.path.dir, // eg: /some/web-path
                                    dir: x.dirname // eg: src/local/sources
                                });
                            })
                            .toArray()
                            .mapTo(respond([null, true], nextState))
                            .catch(err => {
                                debug('err in processing dirs', err);
                                return of(respond([null, false], nextState));
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
