import {Observable} from 'rxjs';
import {ServerState} from "./Server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";

export namespace ServerStop {
    export type Response = [null, string];
}

export function stopHandler(stream: IMethodStream<void, ServerStop.Response, ServerState>) {
    return stream.flatMap(({respond, state}) => {
        const {server} = state;
        if (server && server.listening) {
            server.close();
        }
        return Observable.of(respond([null, 'Done!'], {server: null, app: null, scheme: null}));
    })
}
