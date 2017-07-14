import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Actor} from "aktor-js/dist/createActor";
import {ActorRef} from "aktor-js/dist/ActorRef";

export default function(address: string, context: IActorContext) {

    return {
        methods: {
            init: function (stream) {
                return stream.flatMap(({payload, respond}) => {
                    return Observable.of(respond('kkk'));
                })
            }
        },
        patterns: ['reduxObservable']
    }
}