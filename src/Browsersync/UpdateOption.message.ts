import {Observable} from 'rxjs';
import {IMethodStream} from "aktor-js";
import {BrowserSyncState} from "../Browsersync";

const { of } = Observable;

export namespace BrowsersyncUpdateOption {
    export type Input = {
        path: string|string[],
        fn(...args): any
    };
    export type Response = [null, string];
}

export function updateOptionHandler(stream: IMethodStream<BrowsersyncUpdateOption.Input, BrowsersyncUpdateOption.Response, BrowserSyncState>): any {
    return stream.switchMap(({payload, respond, state}) => {
        const {path, fn} = payload;
        const updated = state.options.updateIn([].concat(path), fn);
        state.options = updated;
        return of(respond(state.options.getIn([].concat(path)), state));
    })
}
