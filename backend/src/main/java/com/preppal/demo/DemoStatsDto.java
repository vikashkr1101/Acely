package com.preppal.demo;

import java.time.Instant;
import java.util.List;

/** Admin view of demo traffic. */
public record DemoStatsDto(
        Window last7d,
        Window last30d,
        Window allTime,
        int tourSteps,
        /** Last 30 days: visits that reached at least step 1..tourSteps. */
        List<Long> funnel,
        /** Last 30 days: visits by source ("direct" when none). */
        List<Count> sources,
        /** Opens per day, last 14 days, oldest first. */
        List<Day> daily,
        int mobilePct,
        List<Visit> recent) {

    public record Window(long visits, long uniqueVisitors, long completedTour, long openedBts,
                         long hitSignupPrompt, long clickedSignup) {
    }

    public record Count(String label, long count) {
    }

    public record Day(String date, long count) {
    }

    public record Visit(Instant at, String source, boolean mobile, int maxStep, boolean completed,
                        boolean openedBts, boolean hitGate, boolean clickedSignup) {
    }
}
