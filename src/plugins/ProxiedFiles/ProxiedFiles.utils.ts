import {Observable} from 'rxjs';
import {CoreChildren, Methods} from "../../Browsersync";
import {isAbsolute, join, parse} from "path";
import {DirsGet} from "../dirs";
import {IActorContext} from "aktor-js";
import {Exists} from "../../Fs/Exists";
import {ProxiedFilesAdd} from "./AddFile.message";
const {of, empty, from} = Observable;

export function getCwdAndDirs(context, options) {
    const bs = context.actorSelection('/system/core')[0];
    const dirsActor = context.actorSelection(`/system/core/${CoreChildren.Dirs}`)[0];
    return bs.ask(Methods.GetOption, ['cwd']).map(([,cwd]) => cwd)
        .flatMap((cwd) => {
            const baseDir = [].concat(options.baseDirectory)
                .map(x => isAbsolute(x) ? x : join(cwd, x))
                .filter(Boolean)[0];

            const dirsPayload = DirsGet.create(baseDir || cwd, cwd);
            return dirsActor.ask(dirsPayload[0], dirsPayload[1]).map(([, dirs]) => dirs)
                .map(dirs => [cwd, dirs, baseDir]);
        });
}

export function getExistingFiles(context: IActorContext, cwd:string, dirs: string[], baseDir: string, items) {
    const exists = context.actorSelection(`/system/core/exists`)[0];
    return from(items)
        .distinct(({payload}) => payload.path)
        .pluck('payload')
        .map((x: ProxiedFilesAdd.Input) => ({item: x, parsedPath: parse(x.path)}))
        .concatMap(({item, parsedPath}) => {
            const input = item.path;
            const options: ProxiedFilesAdd.ProxiedFilesAddOptions = item.options;
            const dirsToCheck = baseDir ? [baseDir, ...dirs] : [cwd, ...dirs];
            return from(<Array<string>>dirsToCheck)
                .flatMap((dir): Observable<ProxiedFilesAdd.Result> => {

                    const absoluteFilepath = join(dir, parsedPath.dir, parsedPath.base);
                    const absoluteDirPath = join(dir, parsedPath.base);

                    if (options.matchFile) {
                        return of({ // try the full path to the file along with the regular check
                            cwd, input,
                            absolutePath: absoluteFilepath,
                            target: join(dir, parsedPath.dir, parsedPath.base),
                            route: input,
                        }, {
                            cwd, input,
                            absolutePath: absoluteDirPath,
                            target: join(dir, parsedPath.base),
                            route: input,
                        });
                    }
                    return of({
                        cwd, input,
                        absolutePath: absoluteFilepath,
                        target: join(dir, parsedPath.dir),
                        route: parsedPath.dir
                    });
                })
                .concatMap((item: ProxiedFilesAdd.Result) => {
                    const payload = Exists.create(item.absolutePath);
                    return exists.ask(payload[0], payload[1])
                        .flatMap((result) => {
                            if (result) {
                                return of(item);
                            }
                            return empty();
                        });
                })
                .take(1)
        })

}