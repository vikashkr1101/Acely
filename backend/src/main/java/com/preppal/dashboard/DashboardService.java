package com.preppal.dashboard;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.preppal.ai.Rubric;
import com.preppal.ai.RubricService;
import com.preppal.interview.InterviewSession;
import com.preppal.interview.InterviewSessionRepository;
import com.preppal.interview.InterviewType;
import com.preppal.interview.Question;
import com.preppal.interview.ReadinessService;
import com.preppal.interview.SessionStatus;
import com.preppal.interview.dto.DimensionScoreDto;
import com.preppal.metric.MetricPhase;
import com.preppal.metric.SessionMetric;
import com.preppal.metric.SessionMetricRepository;
import com.preppal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final InterviewSessionRepository sessions;
    private final SessionMetricRepository metrics;
    private final RubricService rubrics;
    private final ReadinessService readinessService;

    private static final ObjectMapper MAPPER = new ObjectMapper();

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

        List<DashboardDto.RecentMock> recent = newestFirst.stream().limit(8)
                .map(s -> new DashboardDto.RecentMock(s.getId(), s.getRole(), s.getStatus().name(),
                        s.getOverallScore(), s.getCreatedAt(),
                        s.getInterviewType() == null ? null : s.getInterviewType().name()))
                .toList();

        var r = readinessService.forUser(user.getId()); // ONE readiness definition (measurements-only)
        return new DashboardDto(
                r.score(),
                r.measurements(),
                r.estimatedPending(),
                user.getPrimaryTrack() == null ? null : user.getPrimaryTrack().label(),
                newestFirst.size(),
                avgScore,
                streak(newestFirst),
                scoreTrend,
                skills,
                journey,
                recent,
                byType(chrono),
                plan(newestFirst));
    }

    /** "What to practise next" from the latest completed checkpoint (+ whether a fresh one is due). */
    private static final int CHECKPOINT_DUE_AFTER = 6;

    private DashboardDto.Plan plan(List<InterviewSession> newestFirst) {
        InterviewSession cp = newestFirst.stream()
                .filter(s -> s.isCheckpoint() && s.getStatus() == SessionStatus.COMPLETED && s.getOverallScore() != null)
                .findFirst().orElse(null);
        if (cp == null) {
            return new DashboardDto.Plan(false, null, null, null, 0, false, null);
        }
        // weakest section of that checkpoint
        Map<InterviewType, List<Integer>> agg = new EnumMap<>(InterviewType.class);
        for (Question q : cp.getQuestions()) {
            if (q.getScore() != null && q.getQuestionType() != null) {
                agg.computeIfAbsent(q.getQuestionType(), k -> new ArrayList<>()).add(q.getScore());
            }
        }
        String weakest = null;
        Integer weakestScore = null;
        for (var e : agg.entrySet()) {
            int avg = (int) Math.round(e.getValue().stream().mapToInt(Integer::intValue).average().orElse(0));
            if (weakestScore == null || avg < weakestScore) { weakestScore = avg; weakest = e.getKey().name(); }
        }
        long since = newestFirst.stream()
                .filter(s -> !s.getId().equals(cp.getId()) && s.getCreatedAt().isAfter(cp.getCreatedAt()))
                .count();
        return new DashboardDto.Plan(true, cp.getRole(), weakest, weakestScore, (int) since,
                since >= CHECKPOINT_DUE_AFTER, cp.getCreatedAt());
    }

    /** Per-interview-type progress, each scored on its own rubric (fair, like-with-like). */
    private List<DashboardDto.TypeSummary> byType(List<InterviewSession> chrono) {
        // group chronologically so each type's score trend stays in order
        Map<InterviewType, List<InterviewSession>> grouped = new LinkedHashMap<>();
        for (InterviewSession s : chrono) {
            if (s.getInterviewType() == null) continue;
            grouped.computeIfAbsent(s.getInterviewType(), k -> new ArrayList<>()).add(s);
        }

        List<DashboardDto.TypeSummary> out = new ArrayList<>();
        for (var e : grouped.entrySet()) {
            InterviewType type = e.getKey();
            List<InterviewSession> group = e.getValue();
            List<InterviewSession> completed = group.stream()
                    .filter(s -> s.getStatus() == SessionStatus.COMPLETED && s.getOverallScore() != null)
                    .toList();
            if (completed.isEmpty()) continue;

            List<Integer> scores = completed.stream().map(InterviewSession::getOverallScore).toList();
            int avg = (int) Math.round(scores.stream().mapToInt(Integer::intValue).average().orElse(0));
            int best = scores.stream().mapToInt(Integer::intValue).max().orElse(0);
            List<Integer> trend = scores.size() > 8 ? scores.subList(scores.size() - 8, scores.size()) : scores;
            Instant lastAt = completed.stream().map(InterviewSession::getCreatedAt).max(Instant::compareTo).orElse(null);

            List<DimensionScoreDto> dims = dimAverages(type, completed);
            String weakest = dims.stream().filter(d -> d.score() != null)
                    .min(Comparator.comparingInt(DimensionScoreDto::score))
                    .map(DimensionScoreDto::label).orElse(null);

            Rubric rubric = rubrics.forType(type);
            out.add(new DashboardDto.TypeSummary(type.name(),
                    rubric == null ? type.name() : rubric.getLabel(),
                    completed.size(), avg, avg, best, lastAt, trend, dims, weakest));
        }
        return out;
    }

    /** Average each of a type's rubric dimensions across every answered question of its completed mocks. */
    private List<DimensionScoreDto> dimAverages(InterviewType type, List<InterviewSession> completed) {
        Rubric rubric = rubrics.forType(type);
        List<String[]> defs = rubricDims(rubric); // ordered [key, label]
        Map<String, List<Integer>> agg = new LinkedHashMap<>();
        for (String[] d : defs) agg.put(normKey(d[0]), new ArrayList<>());

        for (InterviewSession s : completed) {
            for (Question q : s.getQuestions()) {
                Map<String, Integer> scored = parseDimScores(q.getRubricJson());
                for (String[] d : defs) {
                    Integer v = scored.get(normKey(d[0]));
                    if (v != null) agg.get(normKey(d[0])).add(v);
                }
            }
        }

        List<DimensionScoreDto> out = new ArrayList<>();
        for (String[] d : defs) {
            List<Integer> vals = agg.get(normKey(d[0]));
            Integer a = vals.isEmpty() ? null
                    : (int) Math.round(vals.stream().mapToInt(Integer::intValue).average().orElse(0));
            out.add(new DimensionScoreDto(d[0], d[1], a, null));
        }
        return out;
    }

    private List<String[]> rubricDims(Rubric rubric) {
        List<String[]> out = new ArrayList<>();
        if (rubric == null) return out;
        try {
            for (JsonNode d : MAPPER.readTree(rubric.getDimensions())) {
                out.add(new String[]{d.path("key").asText(), d.path("label").asText()});
            }
        } catch (Exception ignored) { /* malformed rubric → no dims */ }
        return out;
    }

    private Map<String, Integer> parseDimScores(String rubricJson) {
        Map<String, Integer> out = new HashMap<>();
        if (rubricJson == null || rubricJson.isBlank()) return out;
        try {
            JsonNode dims = MAPPER.readTree(rubricJson).path("dimensions");
            if (dims.isArray()) for (JsonNode d : dims) {
                String nk = normKey(d.path("key").asText());
                if (!nk.isBlank() && d.has("score")) out.put(nk, d.get("score").asInt());
            }
        } catch (Exception ignored) { /* legacy/absent → no dims */ }
        return out;
    }

    private static String normKey(String s) {
        return s == null ? "" : s.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private int avg(List<SessionMetric> ms, String key) {
        var stats = ms.stream()
                .filter(m -> m.getMetricKey().equals(key))
                .mapToInt(m -> m.getValue().intValue());
        var avg = stats.average();
        return avg.isPresent() ? (int) Math.round(avg.getAsDouble()) : 0;
    }

    // Audience is India — count a "day" in IST so a late-evening mock doesn't roll into the next UTC day.
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Kolkata");

    /** Consecutive days (ending today, or yesterday) with at least one mock. */
    private int streak(List<InterviewSession> all) {
        Set<LocalDate> days = new HashSet<>();
        for (InterviewSession s : all) {
            days.add(s.getCreatedAt().atZone(APP_ZONE).toLocalDate());
        }
        if (days.isEmpty()) return 0;
        LocalDate d = LocalDate.now(APP_ZONE);
        if (!days.contains(d)) d = d.minusDays(1);
        int streak = 0;
        while (days.contains(d)) {
            streak++;
            d = d.minusDays(1);
        }
        return streak;
    }
}
