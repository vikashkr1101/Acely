package com.preppal.dashboard;

import com.preppal.interview.InterviewSession;
import com.preppal.interview.InterviewSessionRepository;
import com.preppal.interview.SessionStatus;
import com.preppal.metric.MetricPhase;
import com.preppal.metric.SessionMetric;
import com.preppal.metric.SessionMetricRepository;
import com.preppal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final InterviewSessionRepository sessions;
    private final SessionMetricRepository metrics;

    @Transactional(readOnly = true)
    public DashboardDto forUser(User user) {
        // Newest-first from the repo; keep a chronological copy for trends.
        List<InterviewSession> newestFirst = sessions.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<InterviewSession> chrono = new ArrayList<>(newestFirst);
        Collections.reverse(chrono);

        List<Integer> completedScores = chrono.stream()
                .filter(s -> s.getStatus() == SessionStatus.COMPLETED && s.getOverallScore() != null)
                .map(InterviewSession::getOverallScore)
                .toList();

        int avgScore = completedScores.isEmpty() ? 0
                : (int) Math.round(completedScores.stream().mapToInt(Integer::intValue).average().orElse(0));

        List<Integer> scoreTrend = completedScores.size() > 8
                ? completedScores.subList(completedScores.size() - 8, completedScores.size())
                : completedScores;

        // Metrics across all of the user's sessions
        List<UUID> ids = newestFirst.stream().map(InterviewSession::getId).toList();
        List<SessionMetric> ms = ids.isEmpty() ? List.of() : metrics.findBySessionIdIn(ids);

        var skills = new DashboardDto.SkillBreakdown(
                avg(ms, "communication"), avg(ms, "technical_depth"), avg(ms, "clarity"), avg(ms, "relevance"));

        // Confidence journey: nervousness recorded BEFORE each mock, in chronological order
        Map<UUID, Integer> nervesBefore = new HashMap<>();
        for (SessionMetric m : ms) {
            if (m.getMetricKey().equals("nervousness") && m.getPhase() == MetricPhase.BEFORE) {
                nervesBefore.put(m.getSessionId(), m.getValue().intValue());
            }
        }
        List<DashboardDto.NervePoint> journey = new ArrayList<>();
        int idx = 1;
        for (InterviewSession s : chrono) {
            Integer n = nervesBefore.get(s.getId());
            if (n != null) journey.add(new DashboardDto.NervePoint(idx++, n));
        }

        List<DashboardDto.RecentMock> recent = newestFirst.stream().limit(5)
                .map(s -> new DashboardDto.RecentMock(s.getId(), s.getRole(), s.getStatus().name(),
                        s.getOverallScore(), s.getCreatedAt()))
                .toList();

        return new DashboardDto(
                avgScore, // readiness = rolling average of completed mocks
                newestFirst.size(),
                avgScore,
                streak(newestFirst),
                scoreTrend,
                skills,
                journey,
                recent);
    }

    private int avg(List<SessionMetric> ms, String key) {
        var stats = ms.stream()
                .filter(m -> m.getMetricKey().equals(key))
                .mapToInt(m -> m.getValue().intValue());
        var avg = stats.average();
        return avg.isPresent() ? (int) Math.round(avg.getAsDouble()) : 0;
    }

    /** Consecutive days (ending today, or yesterday) with at least one mock. */
    private int streak(List<InterviewSession> all) {
        Set<LocalDate> days = new HashSet<>();
        for (InterviewSession s : all) {
            days.add(s.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate());
        }
        if (days.isEmpty()) return 0;
        LocalDate d = LocalDate.now(ZoneOffset.UTC);
        if (!days.contains(d)) d = d.minusDays(1);
        int streak = 0;
        while (days.contains(d)) {
            streak++;
            d = d.minusDays(1);
        }
        return streak;
    }
}
