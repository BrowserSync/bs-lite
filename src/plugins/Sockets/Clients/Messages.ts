import {FileEvent} from "../../Watcher/FileEvent.message";

export enum BrowserMessages {
    BrowserReload = 'Browser:Reload',
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
