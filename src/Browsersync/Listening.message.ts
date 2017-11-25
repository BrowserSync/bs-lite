import {Observable} from 'rxjs';
import {IMethodStream, IActorContext} from "aktor-js";
import {ServerListening} from "../plugins/Server/Listening.message";

const {of} = Observable;

export namespace BrowsersyncListening {
    export type Response = [null, boolean];
}

export function getListeningHandler(context: IActorContext): any {
    return function listeningHandler(stream: IMethodStream<any, BrowsersyncListening.Response, any>) {
        return stream.flatMap(({respond, state}) => {
            const server = context.actorSelection('server')[0];
            if (server) {
                return context.gracefulStop(server)
                    .map((listening: ServerListening.Response) => respond(listening, state));
            }
            return of(respond([null, false], state))
        });
    }
}
