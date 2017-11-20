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
    return function stopHandler(stream: IMethodStream<void, BrowsersyncStop.Response, BrowserSyncState>) {
        return stream.switchMap(({respond, state}) => {
            const requiresShutdown = [
                'server',
                'watcher'
            ].map(x => context.actorSelection(x))
                .reduce((acc, item) => acc.concat(item), []);

            return Observable.from(requiresShutdown)
                .flatMap(ref => context.gracefulStop(ref))
                .toArray()
                .mapTo(respond([null, 'done!'], state));
        });
    }
}
