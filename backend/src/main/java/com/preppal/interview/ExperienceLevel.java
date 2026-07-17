package com.preppal.interview;

/** Candidate experience level — calibrates question difficulty and scoring bands. */
public enum ExperienceLevel {
    FRESHER, ZERO_ONE, ONE_THREE, THREE_PLUS;

    /** Human-friendly label used in prompts. */
    public String label() {
        return switch (this) {
            case FRESHER -> "a fresher / final-year student (no professional experience)";
            case ZERO_ONE -> "0-1 years of experience";
            case ONE_THREE -> "1-3 years of experience";
            case THREE_PLUS -> "3+ years of experience";
        };
    }
}
