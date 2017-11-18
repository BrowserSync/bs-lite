import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
import {Options} from "../../index";
import {createMiddleware} from "./ClientJS.utils";

const debug = require('debug')('bs:clientJS');

const {of} = Observable;

export type ClientJSIncomingType = string|string[]|Processed|Processed[];

export interface Processed {
    input?: ClientJSIncomingType;
    content: (options: Options, item?: Processed, req?: any, res?: any) => string;
    id: string
    via: string
}

export enum ClientJSMessages {
    Middleware = 'middleware',
}

export function ClientJS(address: string, context: IActorContext) {
    return {
        postStart() {
            debug('-> postStart()');
        },
        methods: {
            [ClientJSMessages.Middleware]: function (stream: IRespondableStream) {
                return stream.flatMap(({payload, respond}) => {
                    const mw = createMiddleware(payload);
                    return of(respond(mw));
                });
            }
        }
    }
}
export default ClientJS;
