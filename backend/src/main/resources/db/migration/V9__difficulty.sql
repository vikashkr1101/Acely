-- Per-mock difficulty (NORMAL | HARD). Nullable → legacy mocks read as NORMAL.
alter table interview_sessions add column difficulty varchar(20);
