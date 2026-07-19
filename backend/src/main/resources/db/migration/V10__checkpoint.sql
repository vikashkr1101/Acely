-- Checkpoint = a standardized mixed session (fixed Hard, single-shot, fixed structure) used as a
-- comparable readiness milestone. Flag on the session; existing sessions are not checkpoints.
alter table interview_sessions add column checkpoint boolean not null default false;
