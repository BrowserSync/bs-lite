import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Actor} from "aktor-js/dist/createActor";
import {ActorRef} from "aktor-js/dist/ActorRef";

export default function(address: string, context: IActorContext) {

    function createMiddleware(options) {
        return options.map(dir => {
            return {
                route: '',
                dir,
                handle: require('serve-static')(dir)
            }
        })
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
