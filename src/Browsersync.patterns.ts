import {Observable} from 'rxjs';
import {ActorRef} from "aktor-js";
import {BsOptions} from "./options";
import {Methods} from "./Browsersync";

/**
 * Update an option via a path
 */
export function updateOption (bs: ActorRef, path: string|string[], fn): any {
    return bs.ask(Methods.UpdateOption, {
        path: [].concat(path).filter(Boolean),
        fn,
    });
}

/**
 * Get all Browsersync Options as a POJO
 */
export function getOptionsJS(bs: ActorRef): any {
    return bs.ask(Methods.GetOption, [])
        .map(x => x.toJS())
}
