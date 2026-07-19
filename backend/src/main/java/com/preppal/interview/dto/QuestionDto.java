package com.preppal.interview.dto;

import com.preppal.interview.Question;

import java.util.List;
import java.util.UUID;

public record QuestionDto(
        UUID id,
        int ordinal,
        String text,
        boolean answered,
        String answer,
        String feedback,
        String modelAnswer,
        Integer score,
        String questionType,
        boolean followUp,
        List<DimensionScoreDto> dimensions,
        List<AttemptDto> attempts) {

    /** Lightweight view (in-run interview) — no rubric breakdown or attempt history. */
    public static QuestionDto from(Question q) {
        return new QuestionDto(q.getId(), q.getOrdinal(), q.getQuestionText(),
                q.isAnswered(), q.getAnswerTranscript(), q.getFeedback(), q.getModelAnswer(), q.getScore(),
                q.getQuestionType() == null ? null : q.getQuestionType().name(),
                q.getFollowUpOf() != null,
                List.of(), List.of());
    }

    /** Rich report view — carries the per-dimension evidence and the retry history. */
    public static QuestionDto forReport(Question q, List<DimensionScoreDto> dimensions, List<AttemptDto> attempts) {
        return new QuestionDto(q.getId(), q.getOrdinal(), q.getQuestionText(),
                q.isAnswered(), q.getAnswerTranscript(), q.getFeedback(), q.getModelAnswer(), q.getScore(),
                q.getQuestionType() == null ? null : q.getQuestionType().name(),
                q.getFollowUpOf() != null,
                dimensions, attempts);
    }
}
