import {Observable} from 'rxjs';
import {IMethodStream, IActorContext} from "aktor-js";
import {BrowserSyncState} from "../Browsersync";

export namespace BrowsersyncStop {
    export type Response = [null, string];
}

export function getStopHandler(context: IActorContext): any {
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
