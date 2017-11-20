import {Observable} from 'rxjs';
import {ServerMessages} from "../plugins/Server/Server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {BrowserSyncState} from "../Browsersync";
import {IActorContext} from "aktor-js/dist/ActorContext";
import {stopChildren} from "../utils";

const {concat, from} = Observable;

export namespace BrowsersyncStop {
    export type Response = [null, string];
}

export function getStopHandler(context: IActorContext) {
    return function stopHandler(stream: IMethodStream<any, BrowsersyncStop.Response, BrowserSyncState>) {
        return stream.switchMap(({payload, respond, state}) => {
            return stopChildren(context)
                .mapTo(respond([null, 'done!']));
        });
    }
}
