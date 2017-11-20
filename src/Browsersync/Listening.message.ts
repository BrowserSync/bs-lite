import {Observable} from 'rxjs';
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {ServerListening} from "../plugins/Server/Listening.message";
import {IActorContext} from "aktor-js/dist/ActorContext";

const {of} = Observable;

export namespace BrowsersyncListening {
    export type Response = [null, boolean];
}

export function getListeningHandler(context: IActorContext) {
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
