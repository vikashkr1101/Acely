package com.preppal.interview.dto;

import com.preppal.interview.InterviewMode;

import java.util.List;
import java.util.UUID;

public record ReportDto(
        UUID id,
        String role,
        InterviewMode mode,
        Integer overallScore,
        String summary,
        int communication,
        int technical,
        int clarity,
        int relevance,
        Integer nervesBefore,
        Integer nervesAfter,
        List<QuestionDto> questions) {
}
