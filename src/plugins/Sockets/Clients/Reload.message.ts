import {Observable} from 'rxjs';
import {IMethodStream} from "aktor-js";
import {SocketsState} from "../Sockets";

const { empty } = Observable;

export function reloadHandler(stream: IMethodStream<void, void, SocketsState>) {
    return stream.flatMap(({payload, respond, state}) => {
        state.clients.emit('browser:reload', payload);
        return empty();
    });
}
