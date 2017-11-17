import * as actorJS from 'aktor-js';
import {Map} from "immutable";
import {BsOptions, DefaultOptions, DefaultOptionsMethods} from "./options";
import {ActorRef} from "aktor-js/dist/ActorRef";
import {Browsersync, Methods} from "./Browsersync";
import {updateOption, getOptionsJS} from "./Browsersync.patterns";
import {SystemActor} from "aktor-js/dist/SystemActor";
import {Observable} from "rxjs";
import {BrowsersyncInit} from "./Browsersync/Init.message";
import {BSErrorLevel, BSErrorType, printErrors} from './errors';

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

export function create(name = 'Browsersync'): CreateReturn {
    const system = createSystem();
    const bs = system.actorOf(Browsersync, 'core');
    return {
        bs,
        system,
        name,
        init: (options) => bs.ask(Methods.Init, options),
        stop: () => bs.ask(Methods.Stop),
    };
}

export function fromOptions(options: object) {
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
};
