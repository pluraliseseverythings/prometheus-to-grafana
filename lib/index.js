/**
 * Reads prometheus metrics from an endpoint and generates a grafana dashboard
 *
 * @package prometheus-to-grafana
 * @author Domenico Corapi <domenico@grakn.ai>
 */

var minimist = require('minimist')
var request = require('request');
var grafana = require('grafana-dash-gen');

var args = minimist(process.argv.slice(2), {
    string: ['grafana_uri', 'prometheus_uri', 'pkg', 'title', 'token'],
    alias: { h: 'help', v: 'version' },
    default: {
        prometheus_uri: 'http://engine2-dev-sandiego:4567/metrics?format=prometheus',
        grafana_uri: 'http://graylog1-dev-sandiego:3000/api/dashboards/db',
        title: 'Grakn dashboard (test)',
        pkg : 'ai.grakn.engine'},
    '--': true
});

var Row = grafana.Row;
var Dashboard = grafana.Dashboard;
var Panels = grafana.Panels;
var Graph = grafana.Panels.Graph;

String.prototype.replaceAll = function (find, replace) {
    var str = this;
    return str.replace(new RegExp(find, 'g'), replace);
};

var package_string = args["pkg"].replaceAll("\\.", "_") + "_";

function extractMetricsFromEndpoint(body) {
    var metrics = {};
    var lines = body.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.trim().startsWith('#')) {
            var reminder = line.split(package_string)[1];
            if (reminder === undefined) {
                continue;
            }
            var full_metric_name = reminder.split("{")[0].split(" ")[0];
            // We filter out sum metrics
            if (full_metric_name in metrics || full_metric_name.endsWith("_sum")) {
                continue
            }
            var metric = full_metric_name.split("_");
            var on_row = true;
            var row_name = "";
            var metric_name = "";
            var has_quantile = reminder.indexOf("{") > -1;
            for (var j = 0; j < metric.length; j++) {
                var firstLetter = metric[j][0];
                if (on_row) {
                    if (firstLetter === firstLetter.toUpperCase()) {
                        row_name += metric[j];
                        on_row = false
                    } else {
                        row_name += metric[j] + " "
                    }
                } else {
                    metric_name += metric[j] + " ";
                }
            }
            metrics[full_metric_name] = {
                "row_name": row_name,
                "metric_name": metric_name.trim(),
                "full_metric_name": package_string + full_metric_name,
                "has_quantile": has_quantile
            };
        }
    }
    return metrics;
}

function censor(censor) {
    var i = 0;

    return function(key, value) {
        if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value)
            return '[Circular]';

        if(i >= 29) // seems to be a harded maximum of 30 serialized objects?
            return '[Unknown]';

        ++i; // so we know we aren't using the original object anymore

        return value;
    }
}

// Javascript magic. The library expects a Grafite source but we use Prometheus
// The only difference in practice is that we put the expression in "expr" rather than "target"
Graph.prototype.addTarget = function addTarget(target) {
    this.state.targets.push({
        expr: target.toString(),
        hide: target.hide
    });
};

function publish(url, dashboard) {
    var createData = {
        dashboard: dashboard.generate(),
        overwrite: true
    };
    request({
        url: url,
        headers: {'Authorization': 'Bearer ' + args['token']},
        method: 'POST',
        json: createData,
        timeout: 1000
    }, function createResponseHandler(createErr, createResp) {
        if (createErr) {
            console.log('Unable to publish dashboard: ' + createErr);
        } else if ([200, 201].indexOf(createResp.statusCode) === -1) {
            console.log('Unable to publish dashboard');
            console.log('Got statusCode ' + createResp.statusCode);
        } else {
            console.log('Published the dashboard');
        }
    });
}

function makeGrafana(metrics, title) {

    function makePanel() {
        var metricName = thisRow[metric_i];
        left -= 1;
        var fmn = metricName['full_metric_name'];
        var targets = [fmn];
        var metricName = metricName['metric_name'];
        if (metricName['has_quantile']) {
            targets = [fmn + '{quantile="0.5"}', fmn + '{quantile="0.99"}']
        } else if (fmn.endsWith("_count")) {
            targets = ["rate(" + fmn + '[5m])']
            metricName += " (rate)"
        }
        return new Panels.Graph({
            title: metricName,
            span: 4,
            targets: targets,
            legend: {
                avg: false,
                current: false,
                max: false,
                min: false,
                show: false,
                total: false,
                values: false
            },
            datasource: 'prometheus'
        });
    }

    var dashboard = new Dashboard({
        title: title
    });

    var rows = {};
    for(var key in metrics){
        var m = metrics[key];
        var row_name = m["row_name"];
        if (row_name in rows) {
            rows[row_name].push(m)
        } else {
            rows[row_name] = [m]
        }
    }

    for (var row in rows) {
        var thisRow = rows[row];
        var dashboard_row = new Row({'title': row});
        var left = thisRow.length;
        for (var metric_i in thisRow) {
            var panel = makePanel();
            dashboard_row.addPanel(panel)
        }
        dashboard.addRow(dashboard_row)
    }
    var value = dashboard.generate();
    return dashboard;
}

request(args['prometheus_uri'], function (error, response, body) {
    if (error !== null || response.statusCode !== 200) {
        console.log('error:', error);
        console.log('statusCode:', response && response.statusCode);
        return;
    }
    var metrics = extractMetricsFromEndpoint(body);
    var grafanaDashboard = makeGrafana(metrics, args['title']);
    publish(args['grafana_uri'], grafanaDashboard)
});
