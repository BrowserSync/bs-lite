require('source-map-support').install();
const assert = require('assert');
const {BSErrorType, BSErrorLevel, printErrors} = require('../../');

it('handles incorrect input type (setup error)', function (done) {
    const browserSync = require('../../');

    const {bs, init, stop} = browserSync.create();

    init({proxy: 1})
        .subscribe(([errors, output]) => {
            const first = errors[0];
            const type = first.type;
            const level = first.level;
            const printedErrors = printErrors(errors);
            assert.equal(type, BSErrorType.ProxyInvalidInput);
            assert.equal(level, BSErrorLevel.Fatal);
            assert.equal([
                `   Error Type: ProxyInvalidInput`,
                `  Error Level: Fatal`,
                `Error Message: Incoming proxy option must contain at least a \`target\` property`,
                `   Your Input: 1`,
                `     Examples: 'http://example.com' or 'https://example.com'`,
            ].join('\n'), printedErrors);
            done();
        });
});
