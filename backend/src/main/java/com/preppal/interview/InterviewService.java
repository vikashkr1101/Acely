package com.preppal.interview;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.preppal.ai.AiService;
import com.preppal.ai.AnswerScore;
import com.preppal.ai.GeneratedQuestion;
import com.preppal.ai.Rubric;
import com.preppal.ai.RubricService;
import com.preppal.ai.SessionAnalysis;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
    private final ReadinessService readinessService;
    private final com.preppal.user.UserRepository users;

    @Value("${preppal.free.monthly-mocks}")
    private int freeMonthlyMocks;

    /** Max adaptive follow-ups generated per mock (0 disables). */
    @Value("${preppal.interview.followups-per-session:2}")
    private int followupsPerSession;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Fixed checkpoint length (~2 per section) so every checkpoint is a comparable measurement. */
    private static final int CHECKPOINT_QUESTIONS = 8;

    /** Project mocks open by having the candidate pick and describe a real project; follow-ups drill in. */
    private static final String PROJECT_OPENER =
            "To start, walk me through a project you've built or contributed to — what it does, "
            + "your specific role, and the main technologies you used.";

    /** A full mixed interview opens like the real thing — a gentle "tell me about yourself" warm-up. */
    private static final String TMAY_OPENER =
            "To start, tell me a bit about yourself — your background, what you've worked on, "
            + "and what you're looking for in this role.";

    // ── Create a mock: enforce quota, generate questions, persist ───────────
    @Transactional
    public InterviewDto create(User user, CreateInterviewRequest req) {
        enforceQuota(user);

        // Checkpoint = a STANDARDIZED mixed measurement (fixed Hard, single-shot, fixed length).
        // Mock Interview = a MIXED session spanning sections. Practice = a single focused section.
        boolean checkpoint = req.isCheckpoint();
        boolean mixed = checkpoint || req.scoringModeOrDefault() == ScoringMode.INTERVIEW;
        int count = checkpoint ? CHECKPOINT_QUESTIONS : req.countOrDefault();

        InterviewSession session = new InterviewSession(
                user.getId(), req.role().trim(), req.jd(), req.modeOrDefault());
        session.setInterviewType(mixed ? null : req.typeOrDefault());
        session.setExperienceLevel(req.levelOrDefault());
        session.setScoringMode(checkpoint ? ScoringMode.INTERVIEW : req.scoringModeOrDefault());
        session.setDifficulty(checkpoint ? Difficulty.HARD : req.difficultyOrDefault());
        session.setCheckpoint(checkpoint);
        session.setPromptVersion("eval-v1");

        // Checkpoints are STANDARDIZED to the user's benchmark TRACK (+ stack). Capture it the first time
        // (or when they deliberately change it), persist to the profile, and stamp it on THIS session.
        String trackHint = null;
        if (checkpoint) {
            if (req.track() != null && (req.track() != user.getPrimaryTrack()
                    || !java.util.Objects.equals(req.stack(), user.getPrimaryStack()))) {
                user.setPrimaryTrack(req.track());
                user.setPrimaryStack(req.stack());
                users.save(user);
            }
            InterviewTrack track = InterviewTrack.orGeneral(user.getPrimaryTrack());
            session.setTrack(track);
            session.setStack(user.getPrimaryStack());
            trackHint = "This is a STANDARDIZED " + track.label() + " benchmark. Focus the TECHNICAL and"
                    + " PROJECT questions specifically on " + track.focus()
                    + (session.getStack() != null && !session.getStack().isBlank()
                        ? ", using the candidate's stack: " + session.getStack() : "")
                    + ". Keep HR and BEHAVIORAL questions general (not track-specific).";
        }

        // Personalize generation: a checkpoint uses its standardized trackHint; a Practice/Mock Interview
        // uses the candidate's saved stack. Company type (product/service/startup) flavours all of them.
        String companyGuidance = CompanyType.orGeneral(req.companyType()).guidance();
        String genHint;
        if (checkpoint) {
            genHint = trackHint + (companyGuidance.isBlank() ? "" : " " + companyGuidance);
        } else {
            // Precedence JD > stack > general: the client sends a stack ONLY in "My stack" mode (and a JD
            // only in "From a JD" mode), so simply honouring whatever's present gives the right behaviour.
            // This is a per-session stack (not the profile benchmark) — stamp it on the session, not the user.
            StringBuilder h = new StringBuilder();
            String stack = req.stack();
            if (stack != null && !stack.isBlank()) {
                session.setStack(stack.trim());
                h.append("The candidate is preparing with the ").append(stack.trim())
                 .append(" stack — where it fits the section, tailor the TECHNICAL and PROJECT questions to it. ");
            }
            if (!companyGuidance.isBlank()) h.append(companyGuidance);
            genHint = h.length() == 0 ? null : h.toString().trim();
        }

        sessions.save(session); // assign id + createdAt before generating

        List<GeneratedQuestion> generated = mixed
                ? ai.generateMixed(user.getId(), session.getId(), session.getRole(), session.getJd(),
                        count, session.getExperienceLevel(), session.getDifficulty(), genHint)
                : ai.generateQuestions(user.getId(), session.getId(), session.getRole(), session.getJd(),
                        count, session.getInterviewType(), session.getExperienceLevel(), session.getDifficulty(), genHint);

        int ordinal = 1;
        for (GeneratedQuestion g : generated) {
            Question q = new Question(ordinal++, g.text());
            // Mixed: each question carries its own section. Single-type: the session's type.
            q.setQuestionType(g.type() != null ? g.type() : session.getInterviewType());
            session.addQuestion(q);
        }
        // Single-type Project mocks always open with the "walk me through a project" question.
        if (!mixed && session.getInterviewType() == InterviewType.PROJECT && !session.getQuestions().isEmpty()) {
            session.getQuestions().get(0).setQuestionText(PROJECT_OPENER);
        }
        // A full mixed interview (Mock Interview / Readiness Check) opens with a gentle intro warm-up.
        if (mixed && !session.getQuestions().isEmpty()) {
            Question opener = session.getQuestions().get(0);
            opener.setQuestionText(TMAY_OPENER);
            opener.setQuestionType(InterviewType.HR);
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
            // NB: do NOT reset questionType here — it was set at creation (a mixed session's per-question
            // section would otherwise be wiped to null, breaking the per-section report + breakdown).
            questions.save(q);
            return withFollowUp(user, session, q, req.transcript(), AnswerFeedbackDto.pending(q.getId()));
        }

        AnswerScore score = evaluateAndStore(user, session, q, req.transcript(),
                req.paceWpm(), req.fillerWords(), req.speechClarity());
        return withFollowUp(user, session, q, req.transcript(), AnswerFeedbackDto.from(q.getId(), score));
    }

    /** Attach one grounded follow-up (if warranted + under budget) to the feedback, inserting it after the answered question. */
    private AnswerFeedbackDto withFollowUp(User user, InterviewSession session, Question answered,
                                           String transcript, AnswerFeedbackDto base) {
        if (followupsPerSession <= 0) return base;
        if (session.isCheckpoint()) return base;                                 // checkpoints are fixed-length (comparable)
        if (answered.getFollowUpOf() != null) return base;                       // never follow up a follow-up
        if (transcript == null || transcript.trim().length() < 25) return base;  // too thin to build on
        long existing = session.getQuestions().stream().filter(x -> x.getFollowUpOf() != null).count();
        if (existing >= followupsPerSession) return base;

        InterviewType fuType = answered.getQuestionType() != null ? answered.getQuestionType() : session.getInterviewType();
        String text = ai.followUp(user.getId(), session.getId(), session.getRole(),
                fuType, session.getExperienceLevel(), answered.getQuestionText(), transcript);
        if (text == null || text.isBlank()) return base;

        Question fu = insertFollowUp(session, answered, text.trim());
        return base.withFollowUp(QuestionDto.from(fu));
    }

    /** Insert a follow-up right after its parent, shifting later ordinals so the list stays linear. */
    private Question insertFollowUp(InterviewSession session, Question parent, String text) {
        int at = parent.getOrdinal();
        for (Question x : session.getQuestions()) {
            if (x.getOrdinal() > at) x.setOrdinal(x.getOrdinal() + 1);
        }
        Question fu = new Question(at + 1, text);
        // Inherit the PARENT's section (so a follow-up in a mixed interview keeps drilling that section).
        fu.setQuestionType(parent.getQuestionType() != null ? parent.getQuestionType() : session.getInterviewType());
        fu.setFollowUpOf(parent.getId());
        session.addQuestion(fu); // wires the session relationship + keeps the in-memory list consistent
        // Persist the question directly (and flush) so its generated id is populated before we build
        // the DTO the client answers against — a cascade save didn't reliably assign it.
        return questions.saveAndFlush(fu);
    }

    // ── Retry a question: re-answer, re-evaluate, keep the attempt history ──
    @Transactional
    public AnswerFeedbackDto retry(User user, AnswerRequest req) {
        Question q = ownedQuestion(user, req.questionId());
        if (q.getSession().isCheckpoint()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A readiness check is a single-shot measurement — it can't be retried. Take a fresh one anytime.");
        }
        AnswerScore score = evaluateAndStore(user, q.getSession(), q, req.transcript(),
                req.paceWpm(), req.fillerWords(), req.speechClarity());
        return AnswerFeedbackDto.from(q.getId(), score);
    }

    /** Evaluate an answer, record the attempt, update the question, and (first attempt only) the metrics. */
    private AnswerScore evaluateAndStore(User user, InterviewSession session, Question q, String transcript,
                                         Integer paceWpm, Integer fillerWords, Integer speechClarity) {
        // Mixed sessions score each answer on ITS section's rubric; single-type uses the session type.
        InterviewType scoreType = q.getQuestionType() != null ? q.getQuestionType() : session.getInterviewType();
        Rubric rubric = rubrics.forType(scoreType);
        AnswerScore score = ai.scoreAnswer(user.getId(), session.getId(), q.getQuestionText(), transcript,
                scoreType, session.getExperienceLevel(), rubric, session.getDifficulty());
        if (score.estimated()) session.setHasEstimated(true); // any offline-scored answer flags the session

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
        q.setRubricJson(score.rubricJson()); // questionType stays as set at creation (per-section for mixed)
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

        // No scored answers → this was abandoned, not completed. Mark it so it never becomes a phantom
        // measurement (a 0/null that would drag readiness/averages down) and stays out of the trends.
        if (scores.length == 0) {
            session.setOverallScore(null);
            session.setSummary(summaryFor(null));
            session.setStatus(SessionStatus.ABANDONED);
            session.setCompletedAt(Instant.now());
            sessions.save(session);
            return InterviewDto.from(session);
        }

        int overall = Math.round((float) java.util.Arrays.stream(scores).average().orElse(0));
        session.setOverallScore(overall);

        // Grounded, instruction-driven debrief (real coach note + specifics) — computed once, here.
        SessionAnalysis analysis = ai.analyzeSession(user.getId(), sessionId, session.getRole(),
                session.getInterviewType(), session.getExperienceLevel(), perQuestionSummary(session), overall);
        session.setSummary(analysis.coachNote() == null || analysis.coachNote().isBlank()
                ? summaryFor(overall) : analysis.coachNote());
        try {
            session.setAnalysisJson(MAPPER.writeValueAsString(analysis));
        } catch (Exception ignored) { /* keep the coach note; skip the JSON */ }

        session.setStatus(SessionStatus.COMPLETED);
        session.setCompletedAt(Instant.now());
        sessions.save(session);
        return InterviewDto.from(session);
    }

    /** Discard an unfinished session (browser closed, changed their mind) — kept out of trends, not deleted. */
    @Transactional
    public InterviewDto abandon(User user, UUID sessionId) {
        InterviewSession session = ownedSession(user, sessionId);
        if (session.getStatus() == SessionStatus.IN_PROGRESS) {
            session.setStatus(SessionStatus.ABANDONED);
            session.setCompletedAt(Instant.now());
            sessions.save(session);
        }
        return InterviewDto.from(session);
    }

    /**
     * Permanently delete an unfinished mock ("Discard"). Cascades to questions/metrics/attempts
     * (DB ON DELETE CASCADE) and nulls the ai_usage/feedback references. Completed mocks are protected
     * so a stray call can never erase a report that counts toward the readiness trend.
     */
    @Transactional
    public void delete(User user, UUID sessionId) {
        InterviewSession session = ownedSession(user, sessionId);
        if (session.getStatus() == SessionStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A completed mock can't be discarded.");
        }
        sessions.delete(session);
    }

    // ── Incremental end-of-interview scoring ────────────────────────────────
    // The client calls this per answer (one short request each) instead of one long batch — avoids
    // gateway timeouts and paces the LLM calls under free-tier rate limits.
    @Transactional
    public ScoreProgress scoreNext(User user, UUID sessionId) {
        InterviewSession session = ownedSession(user, sessionId);
        List<Question> answered = session.getQuestions().stream()
                .filter(q -> q.getAnswerTranscript() != null && !q.getAnswerTranscript().isBlank())
                .toList();
        int total = answered.size();
        long scored = answered.stream().filter(q -> q.getScore() != null).count();
        Question next = answered.stream().filter(q -> q.getScore() == null).findFirst().orElse(null);
        if (next == null) return new ScoreProgress(true, (int) scored, total);
        evaluateAndStore(user, session, next, next.getAnswerTranscript(), null, null, null);
        return new ScoreProgress(false, (int) scored + 1, total);
    }

    // ── Free-trial usage ────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public UsageDto usage(User user) {
        long used = mocksThisMonth(user.getId());
        boolean pro = "PRO".equalsIgnoreCase(user.getPlan());
        long remaining = pro ? -1 : Math.max(0, freeMonthlyMocks - used);
        // Auto-ramp reads the SAME readiness as the dashboard (measurements-only); 0 until measured.
        Integer readiness = readinessService.forUser(user.getId()).score();
        return new UsageDto(user.getPlan(), used, pro ? -1 : freeMonthlyMocks, remaining,
                readiness == null ? 0 : readiness);
    }

    // ── Rich report: overall + sub-scores + nerves + per-question ───────────
    @Transactional(readOnly = true)
    public ReportDto report(User user, UUID sessionId) {
        InterviewSession s = ownedSession(user, sessionId);
        List<SessionMetric> ms = metrics.findBySessionId(sessionId);
        SessionAnalysis a = parseAnalysis(s.getAnalysisJson());

        // Per-question dims come from EACH question's own section rubric (labels), matched to the
        // scores/evidence in its rubric_json. A MIXED session (Mock Interview / Checkpoint, type null)
        // shows per-SECTION summary bars; a single-type session shows that type's real dimensions.
        // Legacy sessions with no dims fall back to the canonical-4 bars on the frontend.
        boolean mixed = s.getInterviewType() == null;
        Map<InterviewType, List<String[]>> defsByType = new HashMap<>();
        java.util.function.Function<InterviewType, List<String[]>> defsFor = t ->
                t == null ? List.of() : defsByType.computeIfAbsent(t, k -> rubricDims(rubrics.forType(k)));

        List<String[]> sessionDefs = mixed ? List.of() : defsFor.apply(s.getInterviewType());
        Map<String, List<Integer>> dimAgg = new HashMap<>();                 // single-type: normKey -> scores
        for (String[] d : sessionDefs) dimAgg.put(normKey(d[0]), new ArrayList<>());
        Map<InterviewType, List<Integer>> sectionAgg = new LinkedHashMap<>(); // mixed: section -> overalls

        List<QuestionDto> qdtos = new ArrayList<>();
        for (Question q : s.getQuestions()) {
            InterviewType qt = q.getQuestionType() != null ? q.getQuestionType() : s.getInterviewType();
            Map<String, JsonNode> scored = parseDims(q.getRubricJson());
            List<DimensionScoreDto> qdims = new ArrayList<>();
            for (String[] d : defsFor.apply(qt)) {
                JsonNode node = scored.get(normKey(d[0]));
                Integer sc = (node != null && node.has("score")) ? node.get("score").asInt() : null;
                String ev = node == null ? null : node.path("evidence").asText("");
                if (sc != null && !mixed) dimAgg.get(normKey(d[0])).add(sc);
                qdims.add(new DimensionScoreDto(d[0], d[1], sc, (ev == null || ev.isBlank()) ? null : ev));
            }
            if (mixed && qt != null && q.getScore() != null) {
                sectionAgg.computeIfAbsent(qt, k -> new ArrayList<>()).add(q.getScore());
            }
            List<AttemptDto> atts = attempts.findByQuestionIdOrderByAttemptNoAsc(q.getId()).stream()
                    .map(at -> new AttemptDto(at.getAttemptNo(), at.getTranscript(), at.getScore()))
                    .toList();
            qdtos.add(QuestionDto.forReport(q, qdims, atts));
        }

        // Summary bars — per-section for mixed, per-dimension for single-type.
        List<DimensionScoreDto> sessionDims = new ArrayList<>();
        if (mixed) {
            for (InterviewType t : InterviewType.values()) {
                List<Integer> vals = sectionAgg.get(t);
                if (vals == null || vals.isEmpty()) continue;
                int avg = (int) Math.round(vals.stream().mapToInt(Integer::intValue).average().orElse(0));
                sessionDims.add(new DimensionScoreDto(t.name(), sectionLabel(t), avg, null));
            }
        } else {
            for (String[] d : sessionDefs) {
                List<Integer> vals = dimAgg.get(normKey(d[0]));
                Integer avg = vals.isEmpty() ? null
                        : (int) Math.round(vals.stream().mapToInt(Integer::intValue).average().orElse(0));
                sessionDims.add(new DimensionScoreDto(d[0], d[1], avg, null));
            }
        }

        List<RecommendationDto> recommendations = buildRecommendations(user, s, mixed, sessionDims, a);

        return new ReportDto(s.getId(), s.getRole(), s.getMode(),
                s.getInterviewType() == null ? null : s.getInterviewType().name(),
                s.getExperienceLevel() == null ? null : s.getExperienceLevel().name(),
                s.getScoringMode() == null ? null : s.getScoringMode().name(),
                s.getDifficulty() == null ? null : s.getDifficulty().name(),
                s.isCheckpoint(),
                s.getTrack() == null ? null : s.getTrack().label(),
                s.getStack(),
                s.isHasEstimated(),
                s.getOverallScore(), s.getSummary(),
                metricAvg(ms, "communication"), metricAvg(ms, "technical_depth"),
                metricAvg(ms, "clarity"), metricAvg(ms, "relevance"),
                sessionDims,
                nerve(ms, MetricPhase.BEFORE), nerve(ms, MetricPhase.AFTER), s.getCreatedAt(),
                a.strengths(), a.focus(), a.patterns(),
                recommendations,
                qdtos);
    }

    // ── "Before your next interview" — a ranked, deterministic recommendation engine ────────────
    // Each rule fires only if THIS session shows the signal; we sort by impact and keep the top few
    // so it's never a wall. One clear PRIMARY action, plus context the run actually earned.
    private record Rec(int priority, String kind, String text, String cta, String ctaType) {}

    /** How many mocks before we nudge a fresh Readiness Check (matches the dashboard). */
    private static final int CHECKPOINT_DUE_AFTER = 6;

    private List<RecommendationDto> buildRecommendations(User user, InterviewSession s, boolean mixed,
                                                         List<DimensionScoreDto> sessionDims, SessionAnalysis a) {
        if (s.getOverallScore() == null) return List.of();   // nothing to advise on an empty run
        List<Rec> recs = new ArrayList<>();

        // 1. Offline-scored → re-take (highest: it's about the accuracy of the whole reading).
        if (s.isHasEstimated()) {
            recs.add(new Rec(150, "retake",
                    "Some answers were scored offline, so this reading is approximate — re-take for an accurate score.",
                    "Re-take accurately", "RETAKE"));
        }

        // 2. The single highest-leverage coaching action, from the grounded session analysis.
        String focus = (a.focus() != null && !a.focus().isEmpty()) ? a.focus().get(0) : null;
        boolean haveFocus = focus != null && !focus.isBlank();
        if (haveFocus) recs.add(new Rec(120, "focus", focus, null, null));

        // 3. Weakest area → a concrete next mock. Mixed: the lagging SECTION; single-type: its lowest dimension.
        DimensionScoreDto weak = sessionDims.stream()
                .filter(d -> d.score() != null)
                .min(Comparator.comparingInt(DimensionScoreDto::score)).orElse(null);
        if (mixed && weak != null && weak.score() < 65) {
            recs.add(new Rec(100, "section",
                    "Practice your weakest section — " + weak.label() + " (" + weak.score() + ").",
                    "Start a " + weak.label() + " mock", weak.key()));
        } else if (!mixed && !haveFocus && weak != null && weak.score() < 60) {
            recs.add(new Rec(100, "focus",
                    "Sharpen " + weak.label().toLowerCase() + " — it was your lowest dimension this run.", null, null));
        }

        // 4. Several very short answers → the "say more" nudge (no AI, pure heuristic).
        long shortCount = s.getQuestions().stream()
                .filter(q -> q.getScore() != null && q.getAnswerTranscript() != null)
                .filter(q -> wordCount(q.getAnswerTranscript()) < 30)
                .count();
        if (shortCount >= 2) {
            recs.add(new Rec(70, "short",
                    "A few answers were brief — practise saying what you did, why you chose it, and the result.", null, null));
        }

        // 5. A Readiness Check is due (only nudged from non-checkpoint sessions).
        if (!s.isCheckpoint()) {
            List<InterviewSession> mine = sessions.findByUserIdOrderByCreatedAtDesc(user.getId());
            InterviewSession lastCp = mine.stream()
                    .filter(x -> x.isCheckpoint() && x.getStatus() == SessionStatus.COMPLETED)
                    .findFirst().orElse(null);
            long since = lastCp == null
                    ? mine.stream().filter(x -> x.getStatus() == SessionStatus.COMPLETED).count()
                    : mine.stream().filter(x -> x.getCreatedAt().isAfter(lastCp.getCreatedAt())).count();
            boolean due = lastCp == null ? since >= 3 : since >= CHECKPOINT_DUE_AFTER;
            if (due) {
                recs.add(new Rec(60, "checkpoint",
                        lastCp == null
                                ? "You've built a base — take a Readiness Check to see where you truly stand."
                                : "You've done " + since + " mocks since your last check — a Readiness Check shows how far you've climbed.",
                        "Take a Readiness Check", "CHECKPOINT"));
            }
        }

        return recs.stream()
                .sorted(Comparator.comparingInt(Rec::priority).reversed())
                .limit(3)
                .map(r -> new RecommendationDto(r.kind(), r.text(), r.cta(), r.ctaType()))
                .toList();
    }

    private static int wordCount(String s) {
        String t = s == null ? "" : s.trim();
        return t.isEmpty() ? 0 : t.split("\\s+").length;
    }

    /** Ordered (key, label) pairs from a rubric's dimensions JSON; empty when there's no rubric. */
    private List<String[]> rubricDims(Rubric rubric) {
        List<String[]> out = new ArrayList<>();
        if (rubric == null) return out;
        try {
            for (JsonNode d : MAPPER.readTree(rubric.getDimensions())) {
                out.add(new String[]{d.path("key").asText(), d.path("label").asText()});
            }
        } catch (Exception ignored) { /* malformed rubric → no dimension bars */ }
        return out;
    }

    /** normKey -> node{score, evidence} parsed from one answer's stored rubric_json. */
    private Map<String, JsonNode> parseDims(String rubricJson) {
        Map<String, JsonNode> out = new HashMap<>();
        if (rubricJson == null || rubricJson.isBlank()) return out;
        try {
            JsonNode dims = MAPPER.readTree(rubricJson).path("dimensions");
            if (dims.isArray()) for (JsonNode d : dims) {
                String nk = normKey(d.path("key").asText());
                if (!nk.isBlank()) out.put(nk, d);
            }
        } catch (Exception ignored) { /* legacy/absent → no breakdown */ }
        return out;
    }

    /** Lowercase, alphanumeric-only key match (mirrors the evaluator) so casing can't drop a dimension. */
    private static String normKey(String s) {
        return s == null ? "" : s.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    /** Short section label for the per-section summary bars of a mixed report. */
    private static String sectionLabel(InterviewType t) {
        return switch (t) {
            case HR -> "HR";
            case TECHNICAL -> "Technical";
            case BEHAVIORAL -> "Behavioral";
            case PROJECT -> "Project";
        };
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
                    nerve(ms, MetricPhase.BEFORE), nerve(ms, MetricPhase.AFTER), topSkill(ms),
                    s.getScoringMode() == null ? null : s.getScoringMode().name(),
                    s.getInterviewType() == null ? null : s.getInterviewType().name(),
                    s.isCheckpoint(), s.getCreatedAt()));
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

    /** Compact per-question grounding fed to the session analyser. */
    private String perQuestionSummary(InterviewSession session) {
        StringBuilder sb = new StringBuilder();
        for (Question q : session.getQuestions()) {
            if (q.getScore() == null) continue;
            sb.append("Q").append(q.getOrdinal()).append(" (score ").append(q.getScore()).append("/100): ")
                    .append(q.getQuestionText()).append('\n');
            if (q.getAnswerTranscript() != null)
                sb.append("  answer: ").append(truncate(q.getAnswerTranscript(), 400)).append('\n');
            if (q.getFeedback() != null)
                sb.append("  notes: ").append(q.getFeedback()).append('\n');
        }
        return sb.toString();
    }

    private static String truncate(String s, int n) {
        return s.length() <= n ? s : s.substring(0, n) + "…";
    }

    private SessionAnalysis parseAnalysis(String json) {
        if (json != null && !json.isBlank()) {
            try {
                return MAPPER.readValue(json, SessionAnalysis.class);
            } catch (Exception ignored) { /* legacy/absent → empty */ }
        }
        return new SessionAnalysis(null, List.of(), List.of(), List.of());
    }

    private String summaryFor(Integer overall) {
        if (overall == null) return "You started — that's the hardest part. Come back and finish a full run! 🌱";
        if (overall >= 85) return "Fantastic — you're interview-ready! 🎉";
        if (overall >= 70) return "Great work — you're getting sharp. A little more polish and you're there.";
        if (overall >= 50) return "Good progress! Keep practising and your scores will climb. 💪";
        return "Nice start — every mock makes you calmer and stronger. You've got this. 🌱";
    }
}
