import {Observable} from 'rxjs';
import {ActorRef} from "aktor-js/dist/ActorRef";
import {BsOptions} from "./options";
import {Methods} from "./Browsersync";

/**
 * Update an option via a path
 */
export function updateOption (bs: ActorRef, path: string|string[], fn): Observable<any> {
    return bs.ask(Methods.updateOption, {
        path: [].concat(path).filter(Boolean),
        fn,
    });
}

/**
 * Get all Browsersync Options as a POJO
 */
export function getOptionsJS(bs: ActorRef): Observable<BsOptions> {
    return bs.ask(Methods.getOption, [])
        .map(x => x.toJS())
}