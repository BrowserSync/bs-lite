import {Observable} from 'rxjs';
import {ServerState} from "./Server";
import {IMethodStream} from "aktor-js";

export namespace ServerAddress {
    export type Response = [null, null|string];
}

export function serverAddressHandler(stream: IMethodStream<any, ServerAddress.Response, ServerState>): any {
    return stream.map(({respond, state}) => {
        const {server} = state;
        if (server && server.listening) {
            return respond([null, server.address()], state);
        }
        return respond([null, null], state);
    });
}
