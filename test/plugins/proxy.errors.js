require('source-map-support').install();
const assert = require('assert');
const {BSErrorType, BSErrorLevel, printErrors} = require('../../');

it.only('handles incorrect input type (setup error)', function (done) {
    const browserSync = require('../../');

    const {bs, init, stop} = browserSync.create();

    init({proxy: 1})
        .subscribe(([errors, output]) => {
            const first = errors[0];
            const type = first.type;
            const level = first.level;
            assert.equal(type, BSErrorType.ProxyInvalidInput);
            assert.equal(level, BSErrorLevel.Fatal);
            assert.equal([
            `   Error Type: ProxyInvalidInput`,
            `  Error Level: Fatal`,
            `Error Message: Incoming proxy option must contain at least a \`target\` property`,
            `   Your Input: 1`,
            `     Examples: 'http://example.com' or 'https://example.com'`,
        ].join('\n'), printErrors(errors));
            // console.log(printErrors(errors));
            // console.log('   Error Type:', first.type);
            // console.log('Error Message:', first.errors[0].error.message);
            // console.log('   Your Input:', first.errors[0].meta.input);
            // console.log('     Examples:', first.errors[0].meta.examples.join(', '));
            done();
        });
});
