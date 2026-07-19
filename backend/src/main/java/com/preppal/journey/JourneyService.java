package com.preppal.journey;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.preppal.ai.Rubric;
import com.preppal.ai.RubricService;
import com.preppal.interview.InterviewSession;
import com.preppal.interview.InterviewSessionRepository;
import com.preppal.interview.InterviewType;
import com.preppal.interview.Question;
import com.preppal.interview.ScoringMode;
import com.preppal.interview.SessionStatus;
import com.preppal.interview.dto.DimensionScoreDto;
import com.preppal.metric.MetricPhase;
import com.preppal.metric.SessionMetric;
import com.preppal.metric.SessionMetricRepository;
import com.preppal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class JourneyService {

    private final InterviewSessionRepository sessions;
    private final SessionMetricRepository metrics;
    private final RubricService rubrics;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Transactional(readOnly = true)
    public JourneyDto forUser(User user) {
        List<InterviewSession> all = new ArrayList<>(sessions.findByUserIdOrderByCreatedAtDesc(user.getId()));
        Collections.reverse(all); // chronological for the timeline

        // Pre-session nervousness per session (for the "steadier under pressure" insight).
        List<UUID> ids = all.stream().map(InterviewSession::getId).toList();
        Map<UUID, Integer> nervesBefore = new HashMap<>();
        if (!ids.isEmpty()) {
            for (SessionMetric m : metrics.findBySessionIdIn(ids)) {
                if (m.getMetricKey().equals("nervousness") && m.getPhase() == MetricPhase.BEFORE) {
                    nervesBefore.put(m.getSessionId(), m.getValue().intValue());
                }
            }
        }

        List<JourneyDto.Measurement> measurements = new ArrayList<>();
        List<JourneyDto.PracticePoint> practice = new ArrayList<>();

        for (InterviewSession s : all) {
            if (s.getStatus() != SessionStatus.COMPLETED || s.getOverallScore() == null) continue;

            boolean measurement = s.isCheckpoint() || s.getScoringMode() == ScoringMode.INTERVIEW;
            if (measurement) {
                measurements.add(new JourneyDto.Measurement(
                        s.getCreatedAt(), s.getOverallScore(), s.isCheckpoint(), s.getRole(),
                        perSection(s), nervesBefore.get(s.getId())));
            } else if (s.getScoringMode() == ScoringMode.PRACTICE && s.getInterviewType() != null) {
                practice.add(new JourneyDto.PracticePoint(
                        s.getCreatedAt(), s.getInterviewType().name(), s.getOverallScore(), s.getRole(),
                        typeDims(s)));
            }
        }
        return new JourneyDto(measurements, practice);
    }

    /** Per-section overall for a mixed session: group its questions by section, average their scores. */
    private Map<String, Integer> perSection(InterviewSession s) {
        Map<InterviewType, List<Integer>> agg = new EnumMap<>(InterviewType.class);
        for (Question q : s.getQuestions()) {
            if (q.getScore() != null && q.getQuestionType() != null) {
                agg.computeIfAbsent(q.getQuestionType(), k -> new ArrayList<>()).add(q.getScore());
            }
        }
        Map<String, Integer> out = new LinkedHashMap<>();
        for (InterviewType t : InterviewType.values()) {
            List<Integer> vals = agg.get(t);
            if (vals != null && !vals.isEmpty()) {
                out.put(t.name(), (int) Math.round(vals.stream().mapToInt(Integer::intValue).average().orElse(0)));
            }
        }
        return out;
    }

    /** The session type's rubric dimensions, averaged across its questions (for the practice hover). */
    private List<DimensionScoreDto> typeDims(InterviewSession s) {
        List<String[]> defs = rubricDims(rubrics.forType(s.getInterviewType()));
        Map<String, List<Integer>> agg = new HashMap<>();
        for (String[] d : defs) agg.put(normKey(d[0]), new ArrayList<>());
        for (Question q : s.getQuestions()) {
            Map<String, Integer> scored = parseDimScores(q.getRubricJson());
            for (String[] d : defs) {
                Integer v = scored.get(normKey(d[0]));
                if (v != null) agg.get(normKey(d[0])).add(v);
            }
        }
        List<DimensionScoreDto> out = new ArrayList<>();
        for (String[] d : defs) {
            List<Integer> vals = agg.get(normKey(d[0]));
            Integer avg = vals.isEmpty() ? null
                    : (int) Math.round(vals.stream().mapToInt(Integer::intValue).average().orElse(0));
            out.add(new DimensionScoreDto(d[0], d[1], avg, null));
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
        } catch (Exception ignored) { /* legacy/absent */ }
        return out;
    }

    private static String normKey(String s) {
        return s == null ? "" : s.toLowerCase().replaceAll("[^a-z0-9]", "");
    }
}
