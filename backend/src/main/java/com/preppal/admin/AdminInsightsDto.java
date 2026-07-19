package com.preppal.admin;

import java.util.List;

/** Read-only operator snapshot for the admin cockpit. */
public record AdminInsightsDto(
        long totalUsers,
        long newUsers7d,
        long activeUsers7d,
        long totalMocks,
        long mocks7d,
        int completionRate,        // completed / (completed + abandoned), as a %
        Integer avgReadiness,      // measurements-only average; null if none yet
        double estimatedRatePct,   // % of completed sessions with any offline-scored answer
        List<Integer> signupsWeekly, // last 8 weeks, oldest → newest
        List<ProviderHealth> providers,
        List<Slice> practiceMix,
        List<Slice> topRoles,
        long aiUsageRows,
        Integer aiUsageOldestDays) {

    public record ProviderHealth(String provider, long calls, int successPct, long fallbacks) {}

    public record Slice(String label, long count) {}
}
