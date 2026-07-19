package com.preppal.interview;

/**
 * How tough a round the candidate wants, at their level. Orthogonal to {@link ExperienceLevel}
 * (which sets expectations for who they are). HARD = deeper questions + stricter grading.
 */
public enum Difficulty {
    NORMAL, HARD;

    /** Guidance woven into the question-generation prompt. */
    public String generationGuidance() {
        return this == HARD
                ? "Make this a HARD round: ask deeper, more probing questions — push past definitions into "
                  + "the why, trade-offs, edge cases and follow-the-thread scenarios. Fewer softballs."
                : "Keep this a NORMAL round: fair, realistic questions for the level — not deliberately tough.";
    }

    /** Guidance woven into the evaluation prompt (grading strictness). */
    public String gradingGuidance() {
        return this == HARD
                ? "This is a HARD round — grade strictly: apply the LOW end of each band, and a merely "
                  + "adequate answer should not exceed 60. Reserve high scores for genuinely excellent answers."
                : "This is a NORMAL round — grade fairly against the bands as written.";
    }

    public static Difficulty orDefault(Difficulty d) {
        return d == null ? NORMAL : d;
    }
}
