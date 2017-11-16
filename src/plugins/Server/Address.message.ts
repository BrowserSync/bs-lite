import {Observable} from 'rxjs';
import {ServerState} from "./server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";

export namespace ServerAddress {
    export type Response = [null, null|string];
}

export function serverAddressHandler(stream: IMethodStream<any, ServerAddress.Response, ServerState>) {
    return stream.map(({respond, state}) => {
        const {server} = state;
        if (server && server.listening) {
            return respond([null, server.address()], state);
        }
        return respond([null, null], state);
    });
}