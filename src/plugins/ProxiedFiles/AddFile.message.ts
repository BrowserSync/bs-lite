import {FileEvent} from "../Watcher/FileEvent.message";
import {Set} from "immutable";
import {ServerAddMiddleware} from "../Server/AddMiddleware.message";
import {ServedFilesAdd} from "../ServedFiles/ServedFiles";
import {WatcherNamespace} from "../Watcher/AddItems.message";
import {getCwdAndDirs, getExistingFiles} from "./ProxiedFiles.utils";
import {Observable} from "rxjs";
import {parse} from "path";
import {Middleware} from "../Server/Server";
import {ServeStaticMiddleware} from "../ServeStatic/ServeStatic";
import {ProxiedFilesMessages} from "./ProxiedFiles";

const debug = require('debug')('bs:ProxiedFiles:AddFile');

const {of, empty} = Observable;

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

export function addFileHandler(context, items) {

    const last = items[items.length - 1];
    const {respond, state} = last;

    const options: ProxiedFilesAdd.ProxiedFilesAddOptions = last.payload.options;
    const ssActor = context.actorSelection(`/system/core/serveStatic`)[0];
    const serverActor = context.actorSelection(`/system/core/server`)[0];
    const servedFilesActor = context.actorSelection(`/system/core/servedFiles`)[0];

    return getCwdAndDirs(context, options)
        .flatMap(([cwd, dirs, baseDir]) => {
            return getExistingFiles(context, cwd, dirs, baseDir, items);
        })
        .filter((item: ProxiedFilesAdd.Result) => {
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
        .do((item: ProxiedFilesAdd.Result) => {
            debug('+++MATCH+++ possible Serve Static option...');
            debug({
                route: item.route,
                dir: item.target
            });
        })
        .flatMap((item: ProxiedFilesAdd.Result) => {
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
}