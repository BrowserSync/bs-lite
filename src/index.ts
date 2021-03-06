import {Observable} from "rxjs";
import * as actorJS from 'aktor-js';
import {Map} from "immutable";
import {BsOptions, DefaultOptions, DefaultOptionsMethods} from "./options";
import {ActorRef, SystemActor} from "aktor-js";
import {Dependencies, getBrowsersyncFactory, Methods} from "./Browsersync";
import {updateOption, getOptionsJS} from "./Browsersync.patterns";
import {BrowsersyncInit} from "./Browsersync/Init.message";
import {BSErrorLevel, BSErrorType, printErrors} from './errors';
import {WatcherMessages} from './plugins/Watcher/Watcher';

const debug = require('debug')('bs:system');

const {createSystem} = actorJS;

export type Options = Map<keyof BsOptions, any>

export interface CreateReturn {
    bs: ActorRef,
    system: SystemActor,
    name: string,
    init(options: object): Observable<BrowsersyncInit.Response>
    stop(): Observable<string>
}

export function create(name = 'Browsersync', deps: Dependencies = {}): any {
    const system = createSystem({
        timeScheduler: deps.timeScheduler,
    });
    const bs = system.actorOf(getBrowsersyncFactory(deps), 'core');
    return {
        bs,
        system,
        name,
        init: (options) => bs.ask(Methods.Init, options),
        stop: () => system.gracefulStop(bs),
    };
}

export function fromOptions(options: object): any {
    const system = createSystem();
    return system.actorOf(DefaultOptions)
        .ask(DefaultOptionsMethods.Merge, options);
}

export {
    updateOption,
    getOptionsJS,
    createSystem,
    Methods,
    BSErrorLevel,
    BSErrorType,
    printErrors,
    WatcherMessages,
};
