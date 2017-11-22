export enum BrowserMessages {
    BrowserReload = 'Browser:Reload',
}

export namespace BrowserReload {
    export type Name = BrowserMessages.BrowserReload;
    export type Payload = {force: boolean};
    export type Message = {name: BrowserReload.Name, payload: BrowserReload.Payload};
}