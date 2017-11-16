import {Observable} from 'rxjs';
import {ServerMessages} from "../plugins/Server/server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {ServerListening} from "../plugins/Server/Listening.message";

export namespace BrowsersyncListening {
    export type Response = [null, boolean];
}

export function listeningHandler(stream: IMethodStream<any, BrowsersyncListening.Response, any>) {
    return stream.flatMap(({respond, state}) => {
        return state.server.ask(ServerMessages.Listening)
            .map((listening: ServerListening.Response) => respond(listening, state));
    });
}