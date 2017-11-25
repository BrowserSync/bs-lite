import {Observable} from 'rxjs';
import {IRespondableStream, IActorContext} from "aktor-js";
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

export function ClientJS(address: string, context: IActorContext): any {
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
