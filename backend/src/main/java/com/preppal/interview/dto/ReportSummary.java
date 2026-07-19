package com.preppal.interview.dto;

import com.preppal.interview.InterviewMode;

import java.time.Instant;
import java.util.UUID;

/** Lightweight per-mock summary for the Reports list. */
public record ReportSummary(
        UUID id,
        String role,
        InterviewMode mode,
        String status,
        Integer overallScore,
        Integer questionCount,
        Integer nervesBefore,
        Integer nervesAfter,
        String topSkill,
        String scoringMode,
        String interviewType,
        boolean checkpoint,
        Instant createdAt) {
}
