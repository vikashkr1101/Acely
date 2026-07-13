package com.preppal.interview.dto;

import com.preppal.ai.AnswerScore;

import java.util.UUID;

public record AnswerFeedbackDto(
        UUID questionId,
        int score,
        int communication,
        int technicalDepth,
        int relevance,
        int clarity,
        String feedback,
        String modelAnswer) {

    public static AnswerFeedbackDto from(UUID questionId, AnswerScore s) {
        return new AnswerFeedbackDto(questionId, s.overall(),
                s.communication(), s.technicalDepth(), s.relevance(), s.clarity(),
                s.feedback(), s.modelAnswer());
    }
}
