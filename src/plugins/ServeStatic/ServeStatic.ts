import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Middleware} from "../Server/Server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {BSError} from "../../errors";
import {ServedFilesFile, ServedFilesMessages} from "../ServedFiles/ServedFiles";
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
        cwd: string
        options: SSIncomingType
    };
    export type Response = [null|BSError[], null|Middleware[]];
}

export function ServeStatic (address: string, context: IActorContext) {
    const served = context.actorSelection('/system/core/servedFiles')[0];
    return {
        postStart() {
            debug('-> postStart()');
        },
        methods: {
            [SSMesagges.Middleware]: function (stream: IMethodStream<ServeStaticMiddleware.Input, ServeStaticMiddleware.Response, any>) {
                return stream.map(({payload, respond}) => {
                    const {cwd, options} = payload;
                    const [errors, mw] = createMiddleware(options, cwd, {
                        onFile: (path, stat) => {
                            const payload: ServedFilesFile.Input = {
                                cwd, path
                            };
                            served.tell(ServedFilesMessages.AddFile, payload).subscribe();
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
