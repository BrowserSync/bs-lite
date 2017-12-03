import {Observable} from 'rxjs';
import httpProxy = require('http-proxy');
import {MiddlewareTypes} from "../../Server/Server";
import {checkCookies} from "../proxy-utils";
import {ProxyItem} from "../Options.message";
import {ProxiedFilesAdd, ProxiedFilesMessages} from "../../ProxiedFiles/ProxiedFiles";
import {CoreChildren} from "../../../Browsersync";

const debug = require('debug')('bs:ProxyChild');
const debugRes = require('debug')('bs:ProxyChild:res');

export enum ProxyChildMessages {
    Start = 'Start',
    Stop = 'stop',
}

export function ProxyChild(address, context): any {
    let proxy;
    let parent;
    return {
        postStart() {
            debug('postStart()');
            parent = context.parent;
        },
        receive(name, payload, respond) {
            switch(name) {
                case ProxyChildMessages.Stop: {
                    if (proxy) proxy.close();
                    respond([null, 'ok!']);
                    break;
                }
                case ProxyChildMessages.Start: {
                    if (proxy) proxy.close();
                    const proxiedFiles = context.actorSelection(`/system/core/${CoreChildren.ProxiedFiles}`)[0];

                    const proxyItem: ProxyItem = payload;
                    debug(`target: ${proxyItem.target}`);
                    debug(proxyItem.options);
                    const _proxy = httpProxy.createProxyServer(proxyItem.options);

                    if (proxyItem.proxyErr.length) {
                        proxyItem.proxyErr.forEach(resFn => _proxy.on('error', resFn));
                    }

                    if (proxyItem.proxyRes.length) {
                        proxyItem.proxyRes.forEach(resFn => _proxy.on('proxyRes', resFn));
                    }

                    const mimeWhitelist = [
                        'text/css',
                        'application/javascript; charset=utf-8',
                    ];

                    _proxy.on('proxyRes', (proxyRes, req, res) => {
                        if (res.statusCode === 200 && mimeWhitelist.indexOf(proxyRes['headers']['content-type']) > -1) {
                            const proxiedFilesPayload: ProxiedFilesAdd.Input = {
                                path: req.url
                            };
                            proxiedFiles.tell(ProxiedFilesMessages.AddFile, proxiedFilesPayload).subscribe();
                        }
                    });

                    respond([null, {
                        id: `Browsersync proxy for ${proxyItem.target}`,
                        via: `ProxyChild`,
                        route: '',
                        type: MiddlewareTypes.proxy,
                        handle: (req, res) => {
                            _proxy.web(req, res, {target: proxyItem.target});
                        }
                    }]);
                }
            }
        }
    }
}
