const browserSync = require('../');
// const {Methods} = require('../');

const {bs, init, stop} = browserSync.create();

const config = {
    proxy: "http://ee.demo.wearejh.com/",
    rewriteRules: [
        (req, res, data, opts) => {
            return data.replace(`"domain": ".ee.demo.wearejh.com",`, '');
        }
    ],
};

init(config)
    .subscribe(([errors, output]) => {
        if (errors) {
            return console.log('has errors', errors);
        }
        console.log(output.server.address());
    });