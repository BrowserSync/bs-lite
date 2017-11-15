import {Observable} from 'rxjs';
import {ServerAddress, ServerMessages} from "../plugins/server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {BrowserSyncState} from "../Browsersync";

export namespace BrowsersyncAddress {
    export type Response = [null, string];
}

export function addressHandler(stream: IMethodStream<any, BrowsersyncAddress.Response, BrowserSyncState>) {
    return stream.switchMap(({payload, respond, state}) => {
        return state.server.ask(ServerMessages.Address)
            .map((address: ServerAddress.Response) => respond(address, state));
    });
}