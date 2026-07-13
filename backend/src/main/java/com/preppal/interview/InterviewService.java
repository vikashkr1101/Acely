package com.preppal.interview;

import com.preppal.ai.AiService;
import com.preppal.ai.AnswerScore;
import com.preppal.ai.GeneratedQuestion;
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
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewSessionRepository sessions;
    private final QuestionRepository questions;
    private final SessionMetricRepository metrics;
    private final AiService ai;

    @Value("${preppal.free.monthly-mocks}")
    private int freeMonthlyMocks;

    // ── Create a mock: enforce quota, generate questions, persist ───────────
    @Transactional
    public InterviewDto create(User user, CreateInterviewRequest req) {
        enforceQuota(user);

        InterviewSession session = new InterviewSession(
                user.getId(), req.role().trim(), req.jd(), req.modeOrDefault());
        sessions.save(session); // assign id + createdAt before generating

        List<GeneratedQuestion> generated = ai.generateQuestions(
                user.getId(), session.getId(), session.getRole(), session.getJd(), req.countOrDefault());

        int ordinal = 1;
        for (GeneratedQuestion g : generated) {
            session.addQuestion(new Question(ordinal++, g.text()));
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

    // ── Answer a question: score it via the AI failover chain ───────────────
    @Transactional
    public AnswerFeedbackDto answer(User user, AnswerRequest req) {
        Question q = questions.findById(req.questionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        InterviewSession session = q.getSession();
        if (!session.getUserId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your interview");
        }

        AnswerScore score = ai.scoreAnswer(user.getId(), session.getId(), q.getQuestionText(), req.transcript());
        q.setAnswerTranscript(req.transcript());
        q.setFeedback(score.feedback());
        q.setModelAnswer(score.modelAnswer());
        q.setScore(score.overall());
        questions.save(q);

        // Per-answer skill scores (feed the dashboard skill breakdown)
        UUID sid = session.getId();
        saveMetric(sid, "communication", score.communication());
        saveMetric(sid, "technical_depth", score.technicalDepth());
        saveMetric(sid, "relevance", score.relevance());
        saveMetric(sid, "clarity", score.clarity());

        // Voice/video delivery metrics (optional)
        if (req.paceWpm() != null) saveMetric(sid, "pace_wpm", req.paceWpm());
        if (req.fillerWords() != null) saveMetric(sid, "filler_words", req.fillerWords());

        return AnswerFeedbackDto.from(q.getId(), score);
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

    private String summaryFor(Integer overall) {
        if (overall == null) return "You started — that's the hardest part. Come back and finish a full run! 🌱";
        if (overall >= 85) return "Fantastic — you're interview-ready! 🎉";
        if (overall >= 70) return "Great work — you're getting sharp. A little more polish and you're there.";
        if (overall >= 50) return "Good progress! Keep practising and your scores will climb. 💪";
        return "Nice start — every mock makes you calmer and stronger. You've got this. 🌱";
    }
}
