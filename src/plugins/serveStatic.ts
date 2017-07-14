import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {BSCommonOptions} from "../index";

import {Actor} from "aktor-js/dist/createActor";
import {ActorRef} from "aktor-js/dist/ActorRef";
import {join, parse} from "path";

interface SSIncoming {
    input: string|string[]
    options: BSCommonOptions
}

export default function(address: string, context: IActorContext) {

    function createMiddleware(incoming: SSIncoming) {
        const input = [].concat(incoming.input);
        return input
            .map(input => {
                return {
                    input,
                    parsed: parse(input),
                    resolved: join(incoming.options.cwd, input)
                }
            })
            .map(item => {
                return {
                    route: '',
                    handle: require('serve-static')(item.resolved)
                }
            });
    }

    return {
        methods: {
            init: function (stream) {
                return stream.flatMap(({action, respond}) => {
                    const mw = createMiddleware(action.payload);
                    return Observable.of(respond({mw}));
                })
            }
        },
        patterns: ['reduxObservable']
    }
}
