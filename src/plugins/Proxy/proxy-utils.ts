import {createOne, RewriteRule} from "../../rewrite-rules";
import NodeURL = require('url');
import * as http from "http";
import {doesNotContainDisableParam, headerHasHtmlAccept} from "../../utils";
const url = require('url');

export function proxyRewriteLinks(userServer: NodeURL.Url): RewriteRule {

    const host = userServer.hostname;
    let string = host;
    const port = userServer.port;

    if (host && port) {
        if (parseInt(port, 10) !== 80) {
            string = host + ':' + port;
        }
    }

    // const regex = new RegExp("https?:\\\\/\\\\/" + string + "|https?://" + string + "(\/)?|('|\")(https?://|/|\\.)?" + string + "(\/)?(.*?)(?=[ ,'\"\\s])", "g");
    const regex = new RegExp('https?:\\\\/\\\\/' + string + "|('|\")\\\/\\\/" + string + '|https?://' + string + "(\/)?|('|\")(https?://|/|\\.)?" + string + "(\/)?(.*?)(?=[ ,'\"\\s])", 'g');

    return {
        id: `Browsersync Proxy for ${userServer.href}`,
        via: 'Browsersync Proxy',
        fn: rewriter,
        predicates: [headerHasHtmlAccept, doesNotContainDisableParam]
    };

    function rewriter(req, res, data) {
        return data.replace(regex, function(match) {
            const proxyUrl = req.headers['host'];

            /**
             * Reject subdomains
             */
            if (match[0] === '.') {
                return match;
            }

            const captured = match[0] === "'" || match[0] === '"' ? match[0] : '';

            /**
             * allow http https
             * @type {string}
             */
            const pre = '//';

            if (match[0] === "'" || match[0] === '"') {
                match = match.slice(1);
            }

            /**
             * parse the url
             * @type {number|*}
             */
            const out = url.parse(match);

            /**
             * If host not set, just do a simple replace
             */
            if (!out.host) {
                string = string.replace(/^(\/)/, '');
                return captured + match.replace(string, proxyUrl);
            }

            /**
             * Only add trailing slash if one was
             * present in the original match
             */
            if (out.path === '/') {
                if (match.slice(-1) === '/') {
                    out.path = '/';
                } else {
                    out.path = '';
                }
            }

            /**
             * Finally append all of parsed url
             */
            return [
                captured,
                pre,
                proxyUrl,
                out.path || '',
                out.hash || '',
            ].join('');
        });
    };
}

/**
 * Remove 'domain' from any cookies
 * @param {Object} res
 */
export function checkCookies(proxyRes: http.IncomingMessage) {
    if (typeof(proxyRes.headers['set-cookie']) !== 'undefined') {
        proxyRes.headers['set-cookie'] = (proxyRes.headers['set-cookie'] as any).map(function(item) {
            return rewriteCookies(item);
        });
    }
}

/**
 * Remove the domain from any cookies.
 * @param rawCookie
 * @returns {string}
 */
export function rewriteCookies(rawCookie) {

    const objCookie = (function() {
        // simple parse function (does not remove quotes)
        const obj = {};
        const pairs = rawCookie.split(/; */);

        pairs.forEach( function( pair ) {
            const eqIndex = pair.indexOf('=');

            // skip things that don't look like key=value
            if (eqIndex < 0) {
                return;
            }

            const key = pair.substr(0, eqIndex).trim();
            obj[key] = pair.substr(eqIndex + 1, pair.length).trim();
        });

        return obj;
    })();

    const pairs = Object.keys(objCookie)
        .filter(function(item) {
            return item !== 'domain';
        })
        .map(function(key) {
            return key + '=' + objCookie[key];
        });

    if (rawCookie.match(/httponly/i)) {
        pairs.push('HttpOnly');
    }

    return pairs.join('; ');
}
