#!/usr/bin/env node
require('source-map-support').install();
const {create, printErrors} = require('../');
const {join, isAbsolute} = require('path');

const {bs, init, stop} = create();

const inputs = process.argv.slice(2);

start(inputs);

function start(input, flags) {
    init({
        serveStatic: [].concat(input).filter(Boolean),
        scheme: 'https',
        debug: true
    })
        .subscribe(([errors,  output]) => {
            if (errors) {
                return console.log(printErrors(errors))
            }
            console.log(output.server.address());
        });
}

