-- Adaptive follow-up questions: a follow-up is generated live from the candidate's answer and
-- inserted right after the question that prompted it. Nullable so all existing questions stay valid.
alter table questions add column follow_up_of uuid;
