import * as fs from 'fs';
const debug = require('debug')('bs:fs:Exists');

export namespace Exists {
    export const Name = 'Exists';
    export type Input = string;
    export type Response = boolean;
    export function create(path: Input): [typeof Name, string] {
        return [Name, path];
    }
}

type R<Response, State> = (resp: Response, state?: State) => void;

export function ExistsFactory() {
    return {
        receive(name: string, payload: Exists.Input, respond: R<Exists.Response, void>) {
            switch(name) {
                case Exists.Name: {
                    fs.access(payload, fs.constants.R_OK, function(err) {
                        if (err) {
                            return respond(false);
                        }
                        return respond(true);
                    });
                }
            }
        }
    }
}
