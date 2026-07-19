-- Finer experience ladder: FRESHER / ZERO_ONE / ONE_TWO / TWO_THREE / THREE_FIVE / FIVE_PLUS
-- (was FRESHER / ZERO_ONE / ONE_THREE / THREE_PLUS). Remap legacy rows so they still deserialize.
-- experience_level is a nullable varchar (EnumType.STRING); FRESHER and ZERO_ONE are unchanged.
UPDATE interview_sessions SET experience_level = 'TWO_THREE'  WHERE experience_level = 'ONE_THREE';
UPDATE interview_sessions SET experience_level = 'THREE_FIVE' WHERE experience_level = 'THREE_PLUS';
