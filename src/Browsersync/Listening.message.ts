import {Observable} from 'rxjs';
import {ServerListeningResponse, ServerMessages} from "../plugins/server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";

export namespace BrowsersyncListening {
    export type Response = [null, boolean];
}

export function listeningHandler(stream: IMethodStream<any, BrowsersyncListening.Response, any>) {
    return stream.flatMap(({respond, state}) => {
        return state.server.ask(ServerMessages.Listening)
            .map((listening: ServerListeningResponse) => respond(listening, state));
    });
}