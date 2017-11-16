import {isAbsolute, join} from "path";
import {readFileSync} from "fs";
var proto = Object.prototype;
var gpo = Object.getPrototypeOf;

export function isPojo (obj) {
    if (obj === null || typeof obj !== "object") {
        return false;
    }
    return gpo(obj) === proto;
}

export function template(string, obj) {
    return string.replace(/\{\{(.+?)\}\}/g, function () {
        return obj[arguments[1]] || '';
    });
}

export function abs(path) {
    return tryCatch(() => isAbsolute(path));
}

export function normPath (maybe, cwd) {
    return Right(maybe)
        .chain(path => abs(path).chain(isAbs => {
            return isAbs
                ? Right(path)
                : tryCatch(() => join(cwd, maybe))
        }))
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

export function headerHasHtmlAccept(req) {
    const acceptHeader = req.headers['accept'];
    if (!acceptHeader) {
        return false;
    }
    return acceptHeader.indexOf('html') > -1;
}

export function doesNotContainDisableParam(req) {
    const [before, ...after] = req.url.split('?');
    if (after.length) {
        if (after[0].indexOf('_bs_disable') > -1) {
            return false;
        }
    }
    return true;
}
