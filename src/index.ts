import * as actorJS from 'aktor-js';
import {fromJS, Map} from "immutable";
import {BsOptions, defaultOptions} from "./options";
import {ActorRef} from "aktor-js/dist/ActorRef";
import {Browsersync} from "./Browsersync";
import {updateOption} from "./Browsersync.patterns";
const debug = require('debug')('bs:system');

const {createSystem} = actorJS;

export type Options = Map<keyof BsOptions, any>


export default function init(options: object): ActorRef {

    const system = createSystem();

    return system.actorOf(Browsersync, 'core');
}

export {
    updateOption
};