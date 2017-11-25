import {Observable} from 'rxjs';
import {ServerMessages} from "../plugins/Server/Server";
import {IMethodStream} from "aktor-js";
import {BrowserSyncState} from "../Browsersync";
import {ServerAddress} from "../plugins/Server/Address.message";

export namespace BrowsersyncAddress {
    export type Response = [null, string];
}

export function addressHandler(stream: IMethodStream<any, BrowsersyncAddress.Response, BrowserSyncState>): any {
    return stream.switchMap(({payload, respond, state}) => {
        return state.server.ask(ServerMessages.Address)
            .map((address: ServerAddress.Response) => respond(address, state));
    });
}
