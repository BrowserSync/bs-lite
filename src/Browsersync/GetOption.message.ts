import {Observable} from 'rxjs';
import {IMethodStream} from "aktor-js";
import {BrowserSyncState} from "../Browsersync";

const { of } = Observable;

export namespace BrowsersyncGetOption {
    export type Input = string|string[]
    export type Response = [null, string];
}

export function getOptionHandler(stream: IMethodStream<BrowsersyncGetOption.Input, BrowsersyncGetOption.Response, BrowserSyncState>): any {
    return stream.switchMap(({payload, respond, state}) => {
        const path = payload;
        return of(respond([null, state.options.getIn([].concat(path))], state));
    });
}
