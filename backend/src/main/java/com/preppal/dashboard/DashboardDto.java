package com.preppal.dashboard;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DashboardDto(
        int readiness,
        int mocksDone,
        int avgScore,
        int streakDays,
        List<Integer> scoreTrend,
        SkillBreakdown skills,
        List<NervePoint> confidenceJourney,
        List<RecentMock> recent) {

    public record SkillBreakdown(int communication, int technical, int clarity, int relevance) {
    }

    public record NervePoint(int index, int nervousness) {
    }

    public record RecentMock(UUID id, String role, String status, Integer score, Instant createdAt) {
    }
}
