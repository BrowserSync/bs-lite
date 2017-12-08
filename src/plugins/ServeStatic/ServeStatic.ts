import {Observable} from 'rxjs';
import {Middleware} from "../Server/Server";
import {IMethodStream, IActorContext} from "aktor-js";
import {BSError} from "../../errors";
import {ServedFilesAdd, ServedFilesMessages} from "../ServedFiles/ServedFiles";
import {createMiddleware} from "./ServeStatic.utils";

const debug = require('debug')('bs:serveStatic');

export interface SSOptions {
    onFile(path:string, stat: any): void
}

export interface SSIncomingObject {
    id?: string
    dir?: string|string[];
    route?: string|string[];
    options?: SSOptions
}
export type SSIncomingType = string|string[]|SSIncomingObject|SSIncomingObject[];

export enum SSMesagges {
    Middleware = 'middleware'
}

export namespace ServeStaticMiddleware {
    export type Input = {
        options: SSIncomingType
        cwd: string
    };
    export type Response = [null|BSError[], null|Middleware[]];
    export function create(cwd: string, options: SSIncomingType): [SSMesagges.Middleware, Input] {
        return [SSMesagges.Middleware, {options, cwd}];
    }
}

export function ServeStatic (address: string, context: IActorContext): any {
    return {
        postStart() {
            debug('-> postStart()');
        },
        methods: {
            [SSMesagges.Middleware]: function (stream: IMethodStream<ServeStaticMiddleware.Input, ServeStaticMiddleware.Response, any>) {
                return stream
                    .do(x => debug(x.payload))
                    .map(({payload, respond}) => {
                        const {cwd, options} = payload;
                        const [errors, mw] = createMiddleware(options, cwd, {
                            onFile: (path, stat) => {
                                const payload = ServedFilesAdd.create(cwd, path);
                                debug(path);
                                const served = context.actorSelection('/system/core/servedFiles')[0];
                                served.tell(payload[0], payload[1]).subscribe();
                            }
                        });
                        if (errors.length) {
                            return respond([errors, null]);
                        }
                        return respond([null, mw]);
                    });
            },
        },
    }
}

export default ServeStatic;
