-- Marks a session whose answers were (partly) scored by the offline fallback rather than real AI.
-- Such sessions are shown as "estimated" and excluded from the readiness measurement, so a degraded
-- run never quietly sets a real milestone.
alter table interview_sessions add column has_estimated boolean not null default false;
