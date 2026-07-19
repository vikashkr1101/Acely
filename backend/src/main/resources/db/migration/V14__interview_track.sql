-- Domain-standardized readiness: a benchmark TRACK + a personalization STACK.
-- On the user (their primary benchmark) and on each session (the track active when it was taken).
alter table users add column primary_track varchar(20);
alter table users add column primary_stack varchar(60);

alter table interview_sessions add column track varchar(20);
alter table interview_sessions add column stack varchar(60);
