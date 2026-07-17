-- V5: add per-dimension weights to each rubric (weighted overall instead of a flat mean).
-- Weights live in the rubric data (config-driven, not hard-coded in Java). Weights per
-- type sum to 1.0. V4 is already applied, so this UPDATEs the seeded rows.

update rubric set dimensions =
  '[{"key":"correctness","label":"Correctness","description":"Are the facts and logic actually correct?","weight":0.35},{"key":"depth","label":"Depth","description":"Do they go beyond the surface to the why and the internals?","weight":0.25},{"key":"tradeoffs","label":"Trade-offs","description":"Do they weigh alternatives or trade-offs?","weight":0.20},{"key":"communication","label":"Communication","description":"Is the explanation clear and well structured?","weight":0.20}]'
  where type = 'TECHNICAL';

update rubric set dimensions =
  '[{"key":"structure","label":"Structure (STAR)","description":"Does it follow Situation, Task, Action, Result?","weight":0.30},{"key":"specificity","label":"Specificity","description":"Concrete real details versus vague generalities?","weight":0.25},{"key":"impact","label":"Impact","description":"Is there a clear, ideally quantified outcome?","weight":0.25},{"key":"communication","label":"Communication","description":"Clear, concise, and first-person (I, not we)?","weight":0.20}]'
  where type = 'BEHAVIORAL';

update rubric set dimensions =
  '[{"key":"relevance","label":"Relevance","description":"Does it actually answer the question asked?","weight":0.30},{"key":"self_awareness","label":"Self-awareness","description":"Honest, reflective and self-aware?","weight":0.25},{"key":"motivation","label":"Motivation","description":"Is genuine interest or fit conveyed with a real reason?","weight":0.25},{"key":"communication","label":"Communication","description":"Clear, confident and concise without rambling?","weight":0.20}]'
  where type = 'HR';

update rubric set dimensions =
  '[{"key":"ownership","label":"Ownership","description":"Is their specific role and personal contribution clear?","weight":0.30},{"key":"depth","label":"Technical depth","description":"Do they understand the technical choices and why they made them?","weight":0.25},{"key":"challenges","label":"Challenges","description":"Do they describe a real problem and how they solved it?","weight":0.25},{"key":"communication","label":"Communication","description":"Clear, structured explanation of the project?","weight":0.20}]'
  where type = 'PROJECT';
