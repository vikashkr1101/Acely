package com.preppal.interview.dto;

import com.preppal.interview.InterviewMode;
import com.preppal.interview.InterviewSession;
import com.preppal.interview.SessionStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InterviewDto(
        UUID id,
        String role,
        InterviewMode mode,
        SessionStatus status,
        String scoringMode,
        boolean checkpoint,
        Integer overallScore,
        String summary,
        Instant createdAt,
        List<QuestionDto> questions) {

    public static InterviewDto from(InterviewSession s) {
        return new InterviewDto(
                s.getId(), s.getRole(), s.getMode(), s.getStatus(),
                s.getScoringMode() == null ? null : s.getScoringMode().name(),
                s.isCheckpoint(),
                s.getOverallScore(), s.getSummary(), s.getCreatedAt(),
                s.getQuestions().stream().map(QuestionDto::from).toList());
    }
}
