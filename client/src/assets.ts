import {AssetReload} from "../../src/plugins/Sockets/Clients/BrowserMessageTypes";
import {FileEvent} from "../../src/plugins/Watcher/FileEvent.message";

export function replace(payload: AssetReload.Payload, log) {
    const ss = [].slice.call(document.styleSheets);
    const changedNames = payload.items.map((item: FileEvent.Input) => item.parsed.base);

    const names = ss.reduce((acc, s: CSSStyleSheet, i) => {
        const a: any = document.createElement('A');
        a.href = s.href;
        maybeSwap(changedNames, s);
        const segs = a.pathname.split('/').filter(Boolean);
        const name = segs.slice(-1)[0];
        return acc.concat({
            name,
            search: a.search,
            href: a.href,
            index: i,
        });
    }, []);

    // console.log(names);
    payload.items.forEach((item: FileEvent.Input) => {
        const matches = names.filter(x => x.name === item.parsed.base);
        if (matches.length) {
            log.info(`${matches.length} asset matches found`);
            matches.forEach(match => {
                const nextUrl = getNextUrl(match);
                changeCSS(nextUrl, match.index);
            });
        }
    })
}

function maybeSwap(changedNames: string[], style: CSSStyleSheet) {
    [].slice.call(style.cssRules||[]).forEach((rule, i) => {
        if (rule instanceof CSSImportRule) {
            const a: any = document.createElement('A');
            a.href = rule.href;
            const fake = {
                href: rule.href,
                search: a.search,
            };
            const nextUrl = getNextUrl(fake);
            const segs = a.pathname.split('/').filter(Boolean);
            const name = segs.slice(-1)[0];
            if (changedNames.indexOf(name) > -1) {
                style.deleteRule(i);
                style.insertRule(`@import url("${nextUrl}")`);
            } else {
                if (rule.styleSheet) {
                    maybeSwap(changedNames, rule.styleSheet);
                }
            }
        }
    });
}

function changeCSS(cssFile, cssLinkIndex) {
    const oldlink = document.getElementsByTagName("link").item(cssLinkIndex);
    if (oldlink) {
        oldlink.href = cssFile;
    }
}

function updateSearch(search, key, suffix) {
    if (search === "") {
        return "?" + suffix;
    }

    return "?" + search
        .slice(1)
        .split("&")
        .map(function (item) {
            return item.split("=");
        })
        .filter(function (tuple) {
            return tuple[0] !== key;
        })
        .map(function (item) {
            return [item[0], item[1]].join("=");
        })
        .concat(suffix)
        .join("&");
}

function getNextUrl(anchor: {search: string, href: string}) {
    const timeStamp    = new Date().getTime();
    const key          = "_bs_timestamp_";
    const suffix       = `${key}=${timeStamp}`;
    return anchor.href.split('?')[0] + updateSearch(anchor.search, key, suffix);
}
