import {FileEvent} from "../../Watcher/FileEvent.message";

export enum BrowserMessages {
    BrowserReload = 'Browser:Reload',
    AssetReload = 'Asset:Reload',
}

export namespace BrowserReload {
    export enum Reasons {
        FileChanged = 'FileChanged'
    }
    export type Payload = {
        reason: Reasons,
        items: FileEvent.Input[]
    };
    export type Message = { name: BrowserMessages.BrowserReload, payload: Payload };

    export function create(payload: Payload): [BrowserMessages.BrowserReload, Payload] {
        return [BrowserMessages.BrowserReload, payload];
    }
}

export namespace AssetReload {
    export type Name = BrowserMessages.AssetReload;
    export enum Reasons {
        FileChanged = 'FileChanged'
    }
    export type Payload = {
        reason: Reasons,
        items: FileEvent.Input[]
    };
    export type Message = { name: AssetReload.Name, payload: AssetReload.Payload };
}
