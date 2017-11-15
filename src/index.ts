import * as actorJS from 'aktor-js';
import {fromJS, Map} from "immutable";
import {BsOptions, defaultOptions, DefaultOptions, DefaultOptionsMethods} from "./options";
import {ActorRef} from "aktor-js/dist/ActorRef";
import {Browsersync, Methods, BrowsersyncInitResponse} from "./Browsersync";
import {updateOption, getOptionsJS} from "./Browsersync.patterns";
import {SystemActor} from "aktor-js/dist/SystemActor";
import {Observable} from "rxjs";

const debug = require('debug')('bs:system');

const {createSystem} = actorJS;

export type Options = Map<keyof BsOptions, any>

export interface CreateReturn {
    bs: ActorRef,
    system: SystemActor,
    name: string,
    init(options: object): Observable<BrowsersyncInitResponse>
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
};
