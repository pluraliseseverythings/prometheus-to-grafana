var test = require('tap').test,
    prometheus\-to\-grafana = require(__dirname + '/../../lib/index.js');

prometheus\-to\-grafana(function (err) {
    test('unit', function (t) {
        t.equal(err, null, 'error object is null');
        t.end();
    });
});