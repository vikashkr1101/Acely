-- V7: per-session AI analysis (grounded coach note + strengths/focus/patterns).
-- Additive/nullable; legacy sessions keep working (report falls back gracefully).
alter table interview_sessions add column analysis_json text;
