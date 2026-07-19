package com.preppal.dashboard;

import com.preppal.interview.dto.DimensionScoreDto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DashboardDto(
        Integer readiness,          // null until the first measurement; measurements-only (never practice)
        int readinessMeasurements,  // how many measurements fed it (drives the confidence copy)
        boolean readinessEstimatedPending, // measured, but every run was offline-scored → show a re-take nudge
        String track,               // the user's benchmark track label ("Backend") or null if unset
        int mocksDone,
        int avgScore,
        int streakDays,
        List<Integer> scoreTrend,
        SkillBreakdown skills,
        List<NervePoint> confidenceJourney,
        List<RecentMock> recent,
        List<TypeSummary> byType,
        Plan plan) {

    /**
     * "What to practise next", derived from the latest checkpoint. Drives the persistent dashboard
     * card + the checkpoint invite/reminder.
     */
    public record Plan(
            boolean hasCheckpoint,
            String role,             // the checkpoint's role (frontend derives a coarse domain)
            String weakestSection,   // interview type name, or null
            Integer weakestScore,
            int mocksSinceCheckpoint,
            boolean dueCheckpoint,
            Instant lastCheckpointAt) {
    }

    public record SkillBreakdown(int communication, int technical, int clarity, int relevance) {
    }

    public record NervePoint(int index, int nervousness) {
    }

    public record RecentMock(UUID id, String role, String status, Integer score, Instant createdAt,
                             String interviewType) {
    }

    /**
     * One interview type's progress, computed on its OWN rubric so the dashboard can compare
     * like-with-like (never HR averaged against Technical). Powers the type filter + adaptive skill card.
     */
    public record TypeSummary(
            String type,
            String label,
            int mocks,
            int avgScore,
            int readiness,
            Integer bestScore,
            Instant lastAt,
            List<Integer> scoreTrend,
            List<DimensionScoreDto> dimensions,
            String weakest) {
    }
}
