package com.preppal.interview;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor
public class Question {

    @Id
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private InterviewSession session;

    @Column(nullable = false)
    private int ordinal;

    @Column(name = "question_text", columnDefinition = "text", nullable = false)
    private String questionText;

    @Column(name = "answer_transcript", columnDefinition = "text")
    private String answerTranscript;

    @Column(columnDefinition = "text")
    private String feedback;

    @Column(name = "model_answer", columnDefinition = "text")
    private String modelAnswer;

    private Integer score;

    // ── engine fields (Phase 1; nullable so legacy questions stay valid) ──
    @Enumerated(EnumType.STRING)
    @Column(name = "question_type")
    private InterviewType questionType;

    /** Raw evaluator output for this answer: dimensions + evidence + overall (JSON). */
    @Column(name = "rubric_json", columnDefinition = "text")
    private String rubricJson;

    /** If this question is a retry, the id of the original question it re-attempts. */
    @Column(name = "retry_of")
    private UUID retryOf;

    public Question(int ordinal, String questionText) {
        this.ordinal = ordinal;
        this.questionText = questionText;
    }

    public boolean isAnswered() {
        return answerTranscript != null;
    }
}
