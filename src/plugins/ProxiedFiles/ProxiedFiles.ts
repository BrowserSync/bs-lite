import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";
import {WatcherMessages} from "../Watcher/Watcher";
import {WatcherAddItems, WatcherNamespace} from "../Watcher/AddItems.message";
import {next} from "@kwonoj/rxjs-testscheduler-compat";
import {Methods} from "../../Browsersync";
import {join, parse} from "path";
import {getDirs$} from "../../utils";
import {existsSync} from "fs";
const debug = require('debug')('bs:ProxiedFiles');

const {of} = Observable;

export enum ProxiedFilesMessages {
    Init     = 'Init',
    AddFile  = 'AddFile',
    Stop     = 'Stop',
}

export namespace ProxiedFilesAdd {
    export type Input = {path: string};
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
            [ProxiedFilesMessages.AddFile]: function(stream: IMethodStream<ProxiedFilesAdd.Input, ProxiedFilesAdd.Response, ProxiedFilesState>) {
                return stream
                    .flatMap(({payload, state, respond}) => {
                        if (state.contains(payload.path)) {
                            return of(respond([null, false], state));
                        }
                        const paths = Observable.from(payload.path).map(x => parse(x));
                        const cwd$ = Observable.of(process.cwd());
                        const dir$ = getDirs$(process.cwd(), process.cwd());
                        dir$.withLatestFrom(paths, cwd$,
                            (dir, path, cwd) => {
                                return {
                                    dir, path, cwd, joined: join(dir, path.dir, path.base), dirname: join(dir, path.dir),
                                }
                            })
                            .filter(({dir, path, joined}) => existsSync(joined));
                        const nextState = state.add(payload.path);
                        return of(respond([null, true], nextState));
                    })
                    .catch(er => {
                        console.log(er);
                        return Observable.empty();
                    })
            },
            [ProxiedFilesMessages.Init]: function(stream: IMethodStream<void, ProxiedFilesInit.Response, ProxiedFilesState>) {
                return stream.map(({respond, state}) => {
                    debug(`init, clearing ${state.size} items`);
                    const nextState = Set([]);
                    return respond([null, 'ok'], nextState);
                })
            }
        }
    }
}
