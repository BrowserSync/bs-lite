import {Observable} from 'rxjs';
import {SocketsState} from "./Sockets";
import {IMethodStream} from "aktor-js";

export namespace SocketState {
    export type Response = SocketsState;
}

export function stateHandler(stream: IMethodStream<void, SocketState.Response, SocketsState>): any {
    return stream.switchMap(({respond, state}) => {
        return Observable.of(respond(state, state));
    });
}
