import {isAbsolute, join} from "path";
import {readFileSync} from "fs";
export function template(string, obj) {
    return string.replace(/\{\{(.+?)\}\}/g, function () {
        return obj[arguments[1]] || '';
    });
}

export function normPath (maybe, cwd) {
    return Right(maybe)
        .chain(path => isAbsolute(path) ? Right(path) : tryCatch(() => join(cwd, maybe)))
}

export function readFileSafe(maybePath: string, cwd: string): string {
    return normPath(maybePath, cwd)
        .chain(path => tryCatch(() => readFileSync(path, 'utf8')))
        .fold(err => {
            return `console.log("File not found ${maybePath}");`;
        }, output => {
            return output;
        })
}

export const Right = (x) => ({
    chain: f => f(x),
    map: f => Right(f(x)),
    fold: (f, g) => g(x),
    inspect: () => `Right(${x})`
});

export const Left = (x) => ({
    chain: f => Left(x),
    map: f => Left(x),
    fold: (f, g) => f(x),
    inspect: () => `Left(${x})`
});

export const tryCatch = f => {
    try {
        return Right(f())
    } catch(e) {
        return Left(e)
    }
};
