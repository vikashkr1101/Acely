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
        String modelAnswer,
        QuestionDto followUp) {

    public static AnswerFeedbackDto from(UUID questionId, AnswerScore s) {
        return new AnswerFeedbackDto(questionId, true, s.overall(),
                s.communication(), s.technicalDepth(), s.relevance(), s.clarity(),
                s.feedback(), s.modelAnswer(), null);
    }

    /** Interview mode: the answer is stored now and scored when the mock completes. */
    public static AnswerFeedbackDto pending(UUID questionId) {
        return new AnswerFeedbackDto(questionId, false, 0, 0, 0, 0, 0,
                "Saved — you'll get your results at the end.", "", null);
    }

    /** Same feedback, now carrying a live follow-up question to slot in after this one. */
    public AnswerFeedbackDto withFollowUp(QuestionDto fu) {
        return new AnswerFeedbackDto(questionId, scored, score, communication, technicalDepth,
                relevance, clarity, feedback, modelAnswer, fu);
    }
}
