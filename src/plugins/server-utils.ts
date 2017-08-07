import {join} from "path";
import {readFileSync} from "fs";
import {fromJS, List, Map} from 'immutable';

function certPath(file) {
    return join(__dirname, '..', '..', 'server', 'certs', file);
}

export function getHttpsOptions(options): Map<string, any> {
    const userOption = options.get('https');
    if (Map.isMap(userOption)) {
        if (userOption.has('pfx')) {
            return userOption.mergeDeep(getPFXDefaults(options));
        }
        return userOption.mergeDeep(getHttpsServerDefaults(options));
    }
    return getHttpsServerDefaults(options);
}

function getPFXDefaults(options) {
    return fromJS({
        pfx: readFileSync(options.getIn(['https', 'pfx']), 'utf8'),
    });
}

function getHttpsServerDefaults(options) {
    return fromJS({
        key: getKey(options),
        cert: getCert(options),
        ca: getCa(options),
        passphrase: '',
    });
}

function getCa(options) {
    const caOption = options.getIn(['https', 'ca']);
    // if not provided, use Browsersync self-signed
    if (typeof caOption === 'undefined') {
        return readFileSync(certPath('server.csr'), 'utf8');
    }
    // if a string was given, read that file from disk
    if (typeof caOption === 'string') {
        return readFileSync(caOption, 'utf8');
    }
    // if an array was given, read all
    if (List.isList(caOption)) {
        return caOption.toArray().map(function(x) {
            return readFileSync(x, 'utf8');
        });
    }
}

function getKey(options) {
    return readFileSync(options.getIn(['https', 'key'])  || certPath('server.key'), 'utf8');
}

function getCert(options) {
    return readFileSync(options.getIn(['https', 'cert']) || certPath('server.crt'), 'utf8');
}