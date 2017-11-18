import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {DefaultOptions, DefaultOptionsMethods} from "./options";
import {Map} from "immutable";
import {getOptionsAndMiddleware} from "./Browsersync.init";
import {BrowserSyncServer, ServerMessages} from "./plugins/Server/Server";
import {Options} from "./index";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {ActorRef} from "aktor-js/dist/ActorRef";
import {BrowsersyncInit, initMessageHandler} from "./Browsersync/Init.message";
import {listeningHandler} from "./Browsersync/Listening.message";
import {stopHandler} from "./Browsersync/Stop.message";
import {addressHandler} from "./Browsersync/Address.message";
import {updateOptionHandler} from "./Browsersync/UpdateOption.message";
import {getOptionHandler} from "./Browsersync/GetOption.message";
import {ServedFilesFactory} from "./plugins/ServedFiles/ServedFiles";
import {FindPortFactory} from "./ports";

export enum Methods {
    Init = 'init',
    Stop = 'stop',
    GetOption = 'GetOption',
    UpdateOption = 'UpdateOption',
    Address = 'address',
    Listening = 'Listening'
}

export interface BrowserSyncState {
    server: ActorRef
    options: Options
}

export function getBrowsersyncFactory(deps = {}) {
    return function Browsersync(address: string, context: IActorContext) {
        const children = {
            servedFiles: context.actorOf(ServedFilesFactory, 'servedFiles'),
            findPort: context.actorOf(deps.findPort ? deps.findPort : FindPortFactory, 'findPort'),
            server: context.actorOf(BrowserSyncServer, 'server'),
        }
        return {
            initialState: {
                options: Map({}),
                server: children.server,
            },
            methods: {
                [Methods.Init]: initMessageHandler(context),
                [Methods.GetOption]: getOptionHandler,
                [Methods.UpdateOption]: updateOptionHandler,
                [Methods.Address]: addressHandler,
                [Methods.Stop]: stopHandler,
                [Methods.Listening]: listeningHandler
            },
            postStop() {
                context.stop(children.findPort);
                context.stop(children.servedFiles);
                context.stop(children.server);
            }
        }
    }
}
