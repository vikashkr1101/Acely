package com.preppal.interview.dto;

import com.preppal.ai.AnswerScore;

import java.util.UUID;

public record AnswerFeedbackDto(
        UUID questionId,
        boolean scored,
        int score,
        int communication,
        int technicalDepth,
        int relevance,
        int clarity,
        String feedback,
        String modelAnswer) {

    public static AnswerFeedbackDto from(UUID questionId, AnswerScore s) {
        return new AnswerFeedbackDto(questionId, true, s.overall(),
                s.communication(), s.technicalDepth(), s.relevance(), s.clarity(),
                s.feedback(), s.modelAnswer());
    }

    /** Interview mode: the answer is stored now and scored when the mock completes. */
    public static AnswerFeedbackDto pending(UUID questionId) {
        return new AnswerFeedbackDto(questionId, false, 0, 0, 0, 0, 0,
                "Saved — you'll get your results at the end.", "");
    }
}
