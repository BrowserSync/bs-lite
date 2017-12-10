import {Observable} from 'rxjs';
import {Map} from "immutable";
import {BrowserSyncServer} from "./plugins/Server/Server";
import {Options} from "./index";
import {ActorRef, IActorContext} from "aktor-js";
import {initMessageHandler} from "./Browsersync/Init.message";
import {getListeningHandler} from "./Browsersync/Listening.message";
import {getStopHandler} from "./Browsersync/Stop.message";
import {addressHandler} from "./Browsersync/Address.message";
import {updateOptionHandler} from "./Browsersync/UpdateOption.message";
import {getOptionHandler} from "./Browsersync/GetOption.message";
import {ServedFilesFactory} from "./plugins/ServedFiles/ServedFiles";
import {FindPortFactory} from "./ports";
import {WatcherFactory} from "./plugins/Watcher/Watcher";
import {ProxiedFilesFactory} from "./plugins/ProxiedFiles/ProxiedFiles";
import {DirsFactory} from "./plugins/dirs";
import ServeStatic from "./plugins/ServeStatic/ServeStatic";
import {ExistsFactory} from "./Fs/Exists";

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

export interface Dependencies {
    scheduler?: any;
    timeScheduler?: any;
    findPort?: Function
    dirs?: Function
    exists?: Function
}

export enum CoreChildren {
    ServeStatic = 'serveStatic',
    ServedFiles = 'servedFiles',
    ProxiedFiles = 'proxiedFiles',
    Dirs = 'dirs',
}

export function getBrowsersyncFactory(deps: Dependencies = {}): any {
    return function Browsersync(address: string, context: IActorContext) {
        const children = {
            serveStatic: context.actorOf(ServeStatic, CoreChildren.ServeStatic),
            servedFiles: context.actorOf(ServedFilesFactory, CoreChildren.ServedFiles),
            proxiedFiles: context.actorOf(ProxiedFilesFactory, CoreChildren.ProxiedFiles),
            dirs: context.actorOf(deps.dirs ? deps.dirs : DirsFactory, CoreChildren.Dirs),
            findPort: context.actorOf(deps.findPort ? deps.findPort : FindPortFactory, 'findPort'),
            server: context.actorOf(BrowserSyncServer, 'server'),
            watcher: context.actorOf(WatcherFactory, 'watcher'),
            exists: context.actorOf(deps.exists || ExistsFactory, 'exists'),
        };
        return {
            initialState: {
                options: Map({}),
                server: children.server,
            },
            postStart() {
                // context.watch(children.servedFiles);
            },
            methods: {
                [Methods.Init]: initMessageHandler(context),
                [Methods.GetOption]: getOptionHandler,
                [Methods.UpdateOption]: updateOptionHandler,
                [Methods.Address]: addressHandler,
                [Methods.Stop]: getStopHandler(context),
                [Methods.Listening]: getListeningHandler(context),
            },
            postStop() {
                // context.stop(children.findPort);
                // context.stop(children.servedFiles);
            }
        }
    }
}
