package com.preppal.interview.dto;

import com.preppal.interview.Question;

import java.util.UUID;

public record QuestionDto(
        UUID id,
        int ordinal,
        String text,
        boolean answered,
        String feedback,
        String modelAnswer,
        Integer score) {

    public static QuestionDto from(Question q) {
        return new QuestionDto(q.getId(), q.getOrdinal(), q.getQuestionText(),
                q.isAnswered(), q.getFeedback(), q.getModelAnswer(), q.getScore());
    }
}
