import {FileEvent} from "../../Watcher/FileEvent.message";

export enum BrowserMessages {
    BrowserReload = 'Browser:Reload',
    AssetReload = 'Asset:Reload',
}

export namespace BrowserReload {
    export type Name = BrowserMessages.BrowserReload;
    export enum Reasons {
        FileChanged = 'FileChanged'
    }
    export type Payload = {
        force: boolean,
        reason: Reasons,
        items: FileEvent.Input[]
    };
    export type Message = { name: BrowserReload.Name, payload: BrowserReload.Payload };
}

export namespace AssetReload {
    export type Name = BrowserMessages.AssetReload;
    export enum Reasons {
        FileChanged = 'FileChanged'
    }
    export type Payload = {
        force: boolean,
        reason: Reasons,
        items: FileEvent.Input[]
    };
    export type Message = { name: AssetReload.Name, payload: AssetReload.Payload };
}
