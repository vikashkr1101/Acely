package com.preppal.interview;

/** Candidate experience level — calibrates question difficulty and scoring bands (gradual ramp). */
public enum ExperienceLevel {
    FRESHER, ZERO_ONE, ONE_TWO, TWO_THREE, THREE_FIVE, FIVE_PLUS;

    public static ExperienceLevel orDefault(ExperienceLevel l) {
        return l == null ? FRESHER : l;
    }

    /** Human-friendly label used in prompts. */
    public String label() {
        return switch (this) {
            case FRESHER -> "a fresher / final-year student (no professional experience)";
            case ZERO_ONE -> "an early-career candidate with 0-1 years of experience";
            case ONE_TWO -> "a candidate with 1-2 years of experience";
            case TWO_THREE -> "a candidate with 2-3 years of experience";
            case THREE_FIVE -> "a candidate with 3-5 years of experience";
            case FIVE_PLUS -> "a senior candidate with 5+ years of experience";
        };
    }

    /**
     * Level-appropriate grading expectation appended to the evaluator prompt — a gradual ramp so a
     * fresher isn't judged like a senior, and a senior isn't over-praised for a shallow answer.
     */
    public String gradingExpectation() {
        return switch (this) {
            case FRESHER -> " This candidate is a FRESHER — do NOT dock points for lacking quantified business"
                    + " impact, production scale, or company metrics. Credit lessons learned, scope completed,"
                    + " and clear reasoning instead of real-world results.";
            case ZERO_ONE -> " This is an EARLY-CAREER candidate (0-1 yrs) — credit internship, academic and"
                    + " personal-project work; expect basic clarity and correctness, not production scale or"
                    + " business metrics.";
            case ONE_TWO -> " This candidate has 1-2 yrs — expect concrete examples and some measurable outcomes,"
                    + " but keep expectations modest on scale and leadership.";
            case TWO_THREE -> " This candidate has 2-3 yrs — expect clear ownership, some depth and trade-off"
                    + " reasoning, and at least one quantified outcome.";
            case THREE_FIVE -> " This candidate has 3-5 yrs — expect real depth, trade-off reasoning, quantified"
                    + " impact, and signs of initiative or leadership.";
            case FIVE_PLUS -> " This is a SENIOR candidate (5+ yrs) — hold a high bar: system-level thinking,"
                    + " strong trade-offs, quantified impact, and mentorship or leadership. Do NOT over-praise"
                    + " shallow or generic answers.";
        };
    }
}
