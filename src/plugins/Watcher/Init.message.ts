import {Observable} from 'rxjs';
import {BSError} from "../../errors";
import {WatcherState} from "./Watcher";
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";
import {BsOptions} from "../../options";
import {gracefullyStopChildren} from "../../utils";

const {of} = Observable;

export interface WatcherItem {
    patterns: string[];
    fn(event: string, path: string, stat?: object): void;
    id: string;
}

export type WatcherInput = string | string[];

export namespace WatcherInit {
    export type Input = BsOptions['watch'];
    export type Response = [null|BSError[], null|string];
}

export function getInitHandler(context: IActorContext): any {
    return function initHandler(stream: IMethodStream<WatcherInit.Input, any, WatcherState>): any {
        return stream.switchMap(({payload, respond, state}) => {
            const nextState = {
                ...state,
                ...payload
            };
            return gracefullyStopChildren(context)
                .mapTo(respond([null, 'yay!'], nextState));
        });
    }
}
