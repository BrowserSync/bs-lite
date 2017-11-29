#!/usr/bin/env node
// require('source-map-support').install();
const {create, printErrors} = require('../');
const {join, isAbsolute} = require('path');

const {bs, init, stop} = create();

const inputs = process.argv.slice(2);

start(inputs);

function start(input, flags) {
    init({
        serveStatic: [].concat(input).filter(Boolean),
        debug: true,
        server: {
            port: 8888,
        },
    })
        .subscribe(([errors,  output]) => {
            if (errors) {
                return console.log(printErrors(errors))
            }
            console.log(`http://localhost:${output.server.address().port}`);
        });
}

