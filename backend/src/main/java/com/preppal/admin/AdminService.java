package com.preppal.admin;

import com.preppal.ai.AiUsageRepository;
import com.preppal.feedback.FeedbackRepository;
import com.preppal.interview.InterviewSessionRepository;
import com.preppal.interview.InterviewType;
import com.preppal.interview.SessionStatus;
import com.preppal.user.User;
import com.preppal.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository users;
    private final InterviewSessionRepository sessions;
    private final AiUsageRepository aiUsage;
    private final FeedbackRepository feedback;

    /** On a manual purge, ai_usage rows older than this are deleted (keeps just the last day). */
    public static final int AI_USAGE_RETENTION_DAYS = 1;

    @Transactional(readOnly = true)
    public AdminInsightsDto insights() {
        Instant now = Instant.now();
        Instant weekAgo = now.minus(Duration.ofDays(7));

        long totalUsers = users.count();
        long newUsers7d = users.countByCreatedAtAfter(weekAgo);
        long activeUsers7d = sessions.activeUsersSince(weekAgo);

        long totalMocks = sessions.count();
        long mocks7d = sessions.countByCreatedAtAfter(weekAgo);

        // Completion = finished out of everything started (all users). In-progress / half-done mocks
        // count as not-yet-completed, so the rate honestly drops below 100% when sessions are left open.
        long completed = sessions.countByStatus(SessionStatus.COMPLETED);
        int completionRate = totalMocks == 0 ? 0 : (int) Math.round(100.0 * completed / totalMocks);

        Double avg = sessions.avgReadiness();
        Integer avgReadiness = avg == null ? null : (int) Math.round(avg);

        long estimated = sessions.countByStatusAndHasEstimatedTrue(SessionStatus.COMPLETED);
        double estimatedRatePct = completed == 0 ? 0
                : Math.round(1000.0 * estimated / completed) / 10.0;

        // 8 weekly signup buckets, oldest → newest
        List<Integer> signupsWeekly = new ArrayList<>();
        for (int i = 7; i >= 0; i--) {
            Instant start = now.minus(Duration.ofDays((i + 1) * 7L));
            Instant end = now.minus(Duration.ofDays(i * 7L));
            signupsWeekly.add((int) users.countByCreatedAtBetween(start, end));
        }

        // provider health over the last 30 days
        Instant monthAgo = now.minus(Duration.ofDays(30));
        List<AdminInsightsDto.ProviderHealth> providers = new ArrayList<>();
        for (Object[] r : aiUsage.providerHealth(monthAgo)) {
            long calls = ((Number) r[1]).longValue();
            long success = ((Number) r[2]).longValue();
            long fallbacks = ((Number) r[3]).longValue();
            int successPct = calls == 0 ? 0 : (int) Math.round(100.0 * success / calls);
            providers.add(new AdminInsightsDto.ProviderHealth(String.valueOf(r[0]), calls, successPct, fallbacks));
        }
        providers.sort((a, b) -> Long.compare(b.calls(), a.calls()));

        // practice mix: single-type sessions by type + mixed interviews + readiness checks
        List<AdminInsightsDto.Slice> practiceMix = new ArrayList<>();
        for (Object[] r : sessions.countByType()) {
            practiceMix.add(new AdminInsightsDto.Slice(label((InterviewType) r[0]), ((Number) r[1]).longValue()));
        }
        long interviews = sessions.countMockInterviews();
        long checkpoints = sessions.countByCheckpointTrue();
        if (interviews > 0) practiceMix.add(new AdminInsightsDto.Slice("Mock Interview", interviews));
        if (checkpoints > 0) practiceMix.add(new AdminInsightsDto.Slice("Readiness Check", checkpoints));
        practiceMix.sort((a, b) -> Long.compare(b.count(), a.count()));

        // top 5 roles
        List<AdminInsightsDto.Slice> topRoles = new ArrayList<>();
        for (Object[] r : sessions.topRoles(PageRequest.of(0, 5))) {
            topRoles.add(new AdminInsightsDto.Slice(String.valueOf(r[0]), ((Number) r[1]).longValue()));
        }

        long aiUsageRows = aiUsage.count();
        Instant oldest = aiUsage.oldest();
        Integer oldestDays = oldest == null ? null : (int) Duration.between(oldest, now).toDays();

        return new AdminInsightsDto(totalUsers, newUsers7d, activeUsers7d, totalMocks, mocks7d,
                completionRate, avgReadiness, estimatedRatePct, signupsWeekly, providers,
                practiceMix, topRoles, aiUsageRows, oldestDays);
    }

    /** The full user list for the operator cockpit: who signed up, verified status, and their activity. */
    @Transactional(readOnly = true)
    public List<AdminUserRow> users() {
        Map<UUID, Long> mocks = new HashMap<>();
        for (Object[] r : sessions.mockCountByUser()) mocks.put((UUID) r[0], ((Number) r[1]).longValue());

        Map<UUID, Instant> lastActive = new HashMap<>();
        for (Object[] r : sessions.lastActivityByUser()) lastActive.put((UUID) r[0], (Instant) r[1]);

        Map<UUID, Integer> readiness = new HashMap<>();
        for (Object[] r : sessions.readinessByUser()) {
            if (r[1] != null) readiness.put((UUID) r[0], (int) Math.round(((Number) r[1]).doubleValue()));
        }

        List<AdminUserRow> rows = new ArrayList<>();
        for (User u : users.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))) {
            rows.add(new AdminUserRow(
                    u.getName(), u.getEmail(), u.isEmailVerified(), u.getCreatedAt(),
                    mocks.getOrDefault(u.getId(), 0L), lastActive.get(u.getId()), readiness.get(u.getId())));
        }
        return rows;
    }

    @Transactional(readOnly = true)
    public AdminFeedbackDto feedback() {
        Double avg = feedback.avgRating();
        long total = feedback.count();
        long week = feedback.countByCreatedAtAfter(Instant.now().minus(Duration.ofDays(7)));
        List<AdminFeedbackDto.Item> recent = new ArrayList<>();
        for (Object[] r : feedback.recentWithUser(PageRequest.of(0, 200))) {
            recent.add(new AdminFeedbackDto.Item(
                    (Integer) r[0], String.valueOf(r[1]), (String) r[2], (String) r[4], (Instant) r[3]));
        }
        return new AdminFeedbackDto(avg == null ? null : Math.round(avg * 10) / 10.0, total, week, recent);
    }

    /** Delete ai_usage rows older than the retention window. Returns how many were removed. */
    @Transactional
    public int pruneAiUsage() {
        Instant cutoff = Instant.now().minus(Duration.ofDays(AI_USAGE_RETENTION_DAYS));
        return aiUsage.deleteByCreatedAtBefore(cutoff);
    }

    private static String label(InterviewType t) {
        return switch (t) {
            case HR -> "HR";
            case TECHNICAL -> "Technical";
            case BEHAVIORAL -> "Behavioral";
            case PROJECT -> "Project";
        };
    }
}
