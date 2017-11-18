import {Observable} from 'rxjs';
import {Server} from "http";
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Map} from "immutable";
import {Scheme} from "../../options";
import {serverAddressHandler} from "./Address.message";
import {serverInitHandler} from "./Init.message";
import {stopHandler} from "./Stop.message";
import {listeningHandler} from "./Listening.message";

const debug = require('debug')('bs:server');

export interface MiddlewareResponse {
    mw?: Middleware[],
    options?: Map<string, any>,
}

export enum MiddlewareTypes {
    proxy = 'proxy',
    serveStatic = 'serveStatic',
    clientJs = 'clientJs',
    rewriteRules = 'rewriteRules',
    other = 'other',
}

export interface Middleware {
    id?: string,
    via?: string,
    route: string,
    handle: Function,
    type: MiddlewareTypes,
}

export interface ServerState { 
    server: any,
    app: any,
    scheme: Scheme,
}

export enum ServerMessages {
    Init = 'Detect',
    Listening = 'Listening',
    Stop = 'stop',
    Address = 'Address',
}

export function BrowserSyncServer(address: string, context: IActorContext) {
    return {
        postStart() {
            debug('-> postStart()');
        },
        initialState: {server: null, app: null},
        methods: {
            [ServerMessages.Address]: serverAddressHandler,
            [ServerMessages.Init]: serverInitHandler(context),
            [ServerMessages.Stop]: stopHandler,
            [ServerMessages.Listening]: listeningHandler,
        },
    }
}

