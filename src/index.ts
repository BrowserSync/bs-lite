import * as actorJS from 'aktor-js';
import {fromJS, Map} from "immutable";
import {BsOptions, defaultOptions, DefaultOptions, DefaultOptionsMethods} from "./options";
import {ActorRef} from "aktor-js/dist/ActorRef";
import {Browsersync} from "./Browsersync";
import {updateOption, getOptionsJS} from "./Browsersync.patterns";
import {SystemActor} from "aktor-js/dist/SystemActor";
const debug = require('debug')('bs:system');

const {createSystem} = actorJS;

export type Options = Map<keyof BsOptions, any>


export default function init(options: object): {bs: ActorRef, system: SystemActor } {

    const system = createSystem();
    const bs = system.actorOf(Browsersync, 'core');

    return {bs, system};
}

export function fromOptions(options: object) {
    const system = createSystem();
    return system.actorOf(DefaultOptions)
        .ask(DefaultOptionsMethods.Merge, options);
}

export {
    init,
    updateOption,
    getOptionsJS,
    createSystem,
};
