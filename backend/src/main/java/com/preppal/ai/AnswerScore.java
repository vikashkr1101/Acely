package com.preppal.ai;

/**
 * Result of evaluating a single answer.
 * The canonical 4 (communication / technicalDepth / relevance / clarity) are projected from the
 * rubric's dimensions so the report bars are always populated; {@code overall} is the weighted
 * roll-up; {@code rubricJson} is the raw evaluator output (dimensions + evidence + overall) stored
 * on the question for the richer per-dimension view.
 */
public record AnswerScore(
        int communication,
        int technicalDepth,
        int relevance,
        int clarity,
        int overall,
        String feedback,
        String modelAnswer,
        String rubricJson) {

    /** Graceful result when no AI provider could evaluate the answer. */
    public static AnswerScore fallback() {
        return new AnswerScore(65, 60, 65, 65, 64,
                "Nice effort! We couldn't analyse this one in depth right now, but you're building the habit — keep going. 💪",
                "", null);
    }
}
