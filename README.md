## prometheus-to-grafana
#### Reads prometheus metrics from an endpoint and generates a grafana dashboard


### Installation
```bash
npm install prometheus-to-grafana
```

### Running
The following grabs all the metrics from a certain endpoint _prometheus_uri_ (only the names) and it produces a dashboard
that is published to _grafana_uri_

```bash
npm run start -- --grafana_uri http://grafana/api/dashboard/db --prometheus_uri http://some_text_with_one_metric_per_line/metrics --title "Dashboard title" --token eyJrIjoiWmJNSk11VWs2..your_token
```

The metrics returned by the prometheus uri endpoint should be in the following format:
```
ai_grakn_engine_controller_ConceptController_concept_by_identifier{quantile="0.5",} 0.005886218
ai_grakn_engine_controller_ConceptController_concept_by_identifier{quantile="0.75",} 0.007390021
ai_grakn_engine_controller_ConceptController_concept_by_identifier{quantile="0.95",} 0.033784607
ai_grakn_engine_controller_ConceptController_concept_by_identifier{quantile="0.98",} 0.033784607
# Some comment
ai_grakn_engine_controller_GraqlController_execute_graql_get_count 2.0
ai_grakn_engine_controller_GraqlController_execute_graql_get_sum 0.924807801
```