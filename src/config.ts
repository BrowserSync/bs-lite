import {join} from "path";

export const templates = {
    scriptTag: join(__dirname, '/../templates/script-tags.hbs'),
    connector: join(__dirname, '/../templates/connector.hbs'),
};

export const client = {
    main: join(__dirname + '/../client/dist/bundle.js'),
    mainDist: join(__dirname + '/../client/dist/bundle.min.js'),
    jsFilePath: '/browser-sync-client.js',
};