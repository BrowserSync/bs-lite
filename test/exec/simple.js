const assert = require('assert');

describe('exec simple.js', function() {
    it('gives correct output', function() {
        const {execSync} = require('child_process');
        const output = execSync('node examples/stop.js');
        assert.equal(output.toString(), 'Stopped!\n');
    })
});