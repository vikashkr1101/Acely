-- Register the new voice delivery metric (session_metric.metric_key -> metric.key).
insert into metric (key, label, category, direction, description) values
    ('speech_clarity', 'Speech clarity', 'DELIVERY', 'HIGHER_BETTER',
     'How clearly you spoke, as heard by the recogniser (0-100, best-effort).');
