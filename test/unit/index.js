var test = require('tap').test,
    prometheus_to_grafana = require(__dirname + '/../../lib/index.js');

prometheu_to_grafana(function (err) {
    test('unit', function (t) {
        t.equal(err, null, 'error object is null');
        t.end();
    });
});