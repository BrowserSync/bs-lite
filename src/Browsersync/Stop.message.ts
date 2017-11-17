import {Observable} from 'rxjs';
import {ServerMessages} from "../plugins/Server/Server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {BrowserSyncState} from "../Browsersync";

export namespace BrowsersyncStop {
    export type Response = [null, string];
}

export function stopHandler(stream: IMethodStream<any, BrowsersyncStop.Response, BrowserSyncState>) {
    return stream.switchMap(({payload, respond, state}) => {
        return state.server.ask(ServerMessages.Stop)
            .map(() => respond([null, 'All done!'], state));
    });
}
