package com.preppal.ai;

/** Scores (0-100) + coaching for a single answer. */
public record AnswerScore(
        int communication,
        int technicalDepth,
        int relevance,
        int clarity,
        String feedback,
        String modelAnswer) {

    public int overall() {
        return Math.round((communication + technicalDepth + relevance + clarity) / 4f);
    }

    /** Graceful result when no AI provider could score the answer. */
    public static AnswerScore fallback() {
        return new AnswerScore(65, 60, 65, 65,
                "Nice effort! We couldn't analyse this one in depth right now, but you're building the habit — keep going. 💪",
                "");
    }
}
