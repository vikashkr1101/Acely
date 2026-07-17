package com.preppal.interview;

import com.preppal.ai.AiService;
import com.preppal.ai.AnswerScore;
import com.preppal.ai.GeneratedQuestion;
import com.preppal.ai.Rubric;
import com.preppal.ai.RubricService;
import com.preppal.interview.dto.*;
import com.preppal.metric.MetricPhase;
import com.preppal.metric.SessionMetric;
import com.preppal.metric.SessionMetricRepository;
import com.preppal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewSessionRepository sessions;
    private final QuestionRepository questions;
    private final SessionMetricRepository metrics;
    private final AiService ai;
    private final RubricService rubrics;
    private final AnswerAttemptRepository attempts;

    @Value("${preppal.free.monthly-mocks}")
    private int freeMonthlyMocks;

    // ── Create a mock: enforce quota, generate questions, persist ───────────
    @Transactional
    public InterviewDto create(User user, CreateInterviewRequest req) {
        enforceQuota(user);

        InterviewSession session = new InterviewSession(
                user.getId(), req.role().trim(), req.jd(), req.modeOrDefault());
        session.setInterviewType(req.typeOrDefault());
        session.setExperienceLevel(req.levelOrDefault());
        session.setScoringMode(req.scoringModeOrDefault());
        session.setPromptVersion("eval-v1");
        sessions.save(session); // assign id + createdAt before generating

        List<GeneratedQuestion> generated = ai.generateQuestions(
                user.getId(), session.getId(), session.getRole(), session.getJd(), req.countOrDefault());

        int ordinal = 1;
        for (GeneratedQuestion g : generated) {
            Question q = new Question(ordinal++, g.text());
            q.setQuestionType(session.getInterviewType()); // Phase 1: uniform type per mock
            session.addQuestion(q);
        }
        sessions.save(session);
        return InterviewDto.from(session);
    }

    @Transactional(readOnly = true)
    public InterviewDto get(User user, UUID sessionId) {
        return InterviewDto.from(ownedSession(user, sessionId));
    }

    @Transactional(readOnly = true)
    public List<InterviewDto> list(User user) {
        return sessions.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(InterviewDto::from).toList();
    }

    // ── Answer a question ───────────────────────────────────────────────────
    // Practice mode: score it now. Interview mode: just store it (scored at complete()).
    @Transactional
    public AnswerFeedbackDto answer(User user, AnswerRequest req) {
        Question q = ownedQuestion(user, req.questionId());
        InterviewSession session = q.getSession();

        if (session.getScoringMode() == ScoringMode.INTERVIEW) {
            q.setAnswerTranscript(req.transcript());
            q.setQuestionType(session.getInterviewType());
            questions.save(q);
            return AnswerFeedbackDto.pending(q.getId());
        }

        AnswerScore score = evaluateAndStore(user, session, q, req.transcript(),
                req.paceWpm(), req.fillerWords(), req.speechClarity());
        return AnswerFeedbackDto.from(q.getId(), score);
    }

    // ── Retry a question: re-answer, re-evaluate, keep the attempt history ──
    @Transactional
    public AnswerFeedbackDto retry(User user, AnswerRequest req) {
        Question q = ownedQuestion(user, req.questionId());
        AnswerScore score = evaluateAndStore(user, q.getSession(), q, req.transcript(),
                req.paceWpm(), req.fillerWords(), req.speechClarity());
        return AnswerFeedbackDto.from(q.getId(), score);
    }

    /** Evaluate an answer, record the attempt, update the question, and (first attempt only) the metrics. */
    private AnswerScore evaluateAndStore(User user, InterviewSession session, Question q, String transcript,
                                         Integer paceWpm, Integer fillerWords, Integer speechClarity) {
        Rubric rubric = rubrics.forType(session.getInterviewType());
        AnswerScore score = ai.scoreAnswer(user.getId(), session.getId(), q.getQuestionText(), transcript,
                session.getInterviewType(), session.getExperienceLevel(), rubric);

        int attemptNo = attempts.countByQuestionId(q.getId()) + 1;
        AnswerAttempt attempt = new AnswerAttempt(q.getId(), attemptNo, transcript);
        attempt.setScore(score.overall());
        attempt.setRubricJson(score.rubricJson());
        attempt.setFeedback(score.feedback());
        attempt.setModelAnswer(score.modelAnswer());
        attempts.save(attempt);

        // Question reflects the LATEST attempt, so the report/DTO code stays unchanged.
        q.setAnswerTranscript(transcript);
        q.setFeedback(score.feedback());
        q.setModelAnswer(score.modelAnswer());
        q.setScore(score.overall());
        q.setQuestionType(session.getInterviewType());
        q.setRubricJson(score.rubricJson());
        questions.save(q);

        // Only the FIRST attempt feeds the dashboard competency history (retries update the shown
        // score, not the averaged bars — refined in Phase 1.6 analytics).
        if (attemptNo == 1) {
            UUID sid = session.getId();
            saveMetric(sid, "communication", score.communication());
            saveMetric(sid, "technical_depth", score.technicalDepth());
            saveMetric(sid, "relevance", score.relevance());
            saveMetric(sid, "clarity", score.clarity());
            if (paceWpm != null) saveMetric(sid, "pace_wpm", paceWpm);
            if (fillerWords != null) saveMetric(sid, "filler_words", fillerWords);
            if (speechClarity != null) saveMetric(sid, "speech_clarity", speechClarity);
        }
        return score;
    }

    // ── Record the nervousness check-in (before / after) ────────────────────
    @Transactional
    public void recordNerves(User user, UUID sessionId, NervesRequest req) {
        ownedSession(user, sessionId); // authorises
        metrics.save(new SessionMetric(sessionId, "nervousness", req.phase(),
                BigDecimal.valueOf(req.nervousness())));
    }

    // ── Complete a mock: compute the overall score + a kind summary ─────────
    @Transactional
    public InterviewDto complete(User user, UUID sessionId) {
        InterviewSession session = ownedSession(user, sessionId);

        // Interview mode: answers were stored but not scored — score them now (sequential;
        // provider failover absorbs Gemini rate limits). Only answered, unscored questions.
        if (session.getScoringMode() == ScoringMode.INTERVIEW) {
            for (Question q : session.getQuestions()) {
                if (q.getScore() == null && q.getAnswerTranscript() != null && !q.getAnswerTranscript().isBlank()) {
                    evaluateAndStore(user, session, q, q.getAnswerTranscript(), null, null, null);
                }
            }
        }

        int[] scores = session.getQuestions().stream()
                .map(Question::getScore).filter(s -> s != null).mapToInt(Integer::intValue).toArray();
        Integer overall = scores.length == 0 ? null
                : Math.round((float) java.util.Arrays.stream(scores).average().orElse(0));

        session.setOverallScore(overall);
        session.setSummary(summaryFor(overall));
        session.setStatus(SessionStatus.COMPLETED);
        session.setCompletedAt(Instant.now());
        sessions.save(session);
        return InterviewDto.from(session);
    }

    // ── Free-trial usage ────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public UsageDto usage(User user) {
        long used = mocksThisMonth(user.getId());
        boolean pro = "PRO".equalsIgnoreCase(user.getPlan());
        long remaining = pro ? -1 : Math.max(0, freeMonthlyMocks - used);
        return new UsageDto(user.getPlan(), used, pro ? -1 : freeMonthlyMocks, remaining);
    }

    // ── Rich report: overall + sub-scores + nerves + per-question ───────────
    @Transactional(readOnly = true)
    public ReportDto report(User user, UUID sessionId) {
        InterviewSession s = ownedSession(user, sessionId);
        List<SessionMetric> ms = metrics.findBySessionId(sessionId);
        return new ReportDto(s.getId(), s.getRole(), s.getMode(), s.getOverallScore(), s.getSummary(),
                metricAvg(ms, "communication"), metricAvg(ms, "technical_depth"),
                metricAvg(ms, "clarity"), metricAvg(ms, "relevance"),
                nerve(ms, MetricPhase.BEFORE), nerve(ms, MetricPhase.AFTER), s.getCreatedAt(),
                s.getQuestions().stream().map(QuestionDto::from).toList());
    }

    private int metricAvg(List<SessionMetric> ms, String key) {
        var a = ms.stream().filter(m -> m.getMetricKey().equals(key)).mapToInt(m -> m.getValue().intValue()).average();
        return a.isPresent() ? (int) Math.round(a.getAsDouble()) : 0;
    }

    private Integer nerve(List<SessionMetric> ms, MetricPhase phase) {
        return ms.stream()
                .filter(m -> m.getMetricKey().equals("nervousness") && m.getPhase() == phase)
                .map(m -> m.getValue().intValue()).findFirst().orElse(null);
    }

    // ── Reports list: one lightweight summary per mock ──────────────────────
    @Transactional(readOnly = true)
    public List<ReportSummary> reportList(User user) {
        List<InterviewSession> all = sessions.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<UUID> ids = all.stream().map(InterviewSession::getId).toList();
        Map<UUID, List<SessionMetric>> byId = ids.isEmpty() ? Map.of()
                : metrics.findBySessionIdIn(ids).stream().collect(Collectors.groupingBy(SessionMetric::getSessionId));

        List<ReportSummary> out = new ArrayList<>();
        for (InterviewSession s : all) {
            List<SessionMetric> ms = byId.getOrDefault(s.getId(), List.of());
            out.add(new ReportSummary(s.getId(), s.getRole(), s.getMode(), s.getStatus().name(),
                    s.getOverallScore(), s.getQuestions().size(),
                    nerve(ms, MetricPhase.BEFORE), nerve(ms, MetricPhase.AFTER), topSkill(ms), s.getCreatedAt()));
        }
        return out;
    }

    private static final String[] SKILL_KEYS = {"communication", "technical_depth", "clarity", "relevance"};

    private String topSkill(List<SessionMetric> ms) {
        String best = null;
        int bestVal = 0;
        for (String key : SKILL_KEYS) {
            int v = metricAvg(ms, key);
            if (v > bestVal) {
                bestVal = v;
                best = key;
            }
        }
        return best == null ? null : skillLabel(best);
    }

    private String skillLabel(String key) {
        return switch (key) {
            case "technical_depth" -> "Technical";
            case "communication" -> "Communication";
            case "clarity" -> "Clarity";
            case "relevance" -> "Relevance";
            default -> key;
        };
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    private void enforceQuota(User user) {
        if ("PRO".equalsIgnoreCase(user.getPlan())) return;
        if (mocksThisMonth(user.getId()) >= freeMonthlyMocks) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,
                    "You've used all " + freeMonthlyMocks + " free mocks this month — they reset next month. 💜");
        }
    }

    private long mocksThisMonth(UUID userId) {
        Instant monthStart = YearMonth.now(ZoneOffset.UTC).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return sessions.countByUserIdAndCreatedAtAfter(userId, monthStart);
    }

    private void saveMetric(UUID sessionId, String key, int value) {
        metrics.save(new SessionMetric(sessionId, key, MetricPhase.PER_QUESTION, BigDecimal.valueOf(value)));
    }

    private InterviewSession ownedSession(User user, UUID sessionId) {
        return sessions.findByIdAndUserId(sessionId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview not found"));
    }

    private Question ownedQuestion(User user, UUID questionId) {
        Question q = questions.findById(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        if (!q.getSession().getUserId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your interview");
        }
        return q;
    }

    private String summaryFor(Integer overall) {
        if (overall == null) return "You started — that's the hardest part. Come back and finish a full run! 🌱";
        if (overall >= 85) return "Fantastic — you're interview-ready! 🎉";
        if (overall >= 70) return "Great work — you're getting sharp. A little more polish and you're there.";
        if (overall >= 50) return "Good progress! Keep practising and your scores will climb. 💪";
        return "Nice start — every mock makes you calmer and stronger. You've got this. 🌱";
    }
}
