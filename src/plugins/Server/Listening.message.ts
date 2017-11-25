import {Observable} from 'rxjs';
import {ServerState} from "./Server";
import {IMethodStream} from "aktor-js";

const { of } = Observable;

export namespace ServerListening {
    export type Response = [null, boolean|null];
}

export function listeningHandler(stream: IMethodStream<any, ServerListening.Response, ServerState> ): any {
    return stream.flatMap(({state, respond}) => {
        if (state.server) {
            return of(respond([null, state.server.listening], state));
        }
        return of(respond([null, false], state));
    });
}
