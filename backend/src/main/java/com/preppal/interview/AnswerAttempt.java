package com.preppal.interview;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/** One attempt at answering a question (attempt 1 = first, 2+ = retries). */
@Entity
@Table(name = "answer_attempt")
@Getter
@Setter
@NoArgsConstructor
public class AnswerAttempt {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "attempt_no", nullable = false)
    private int attemptNo;

    @Column(columnDefinition = "text", nullable = false)
    private String transcript;

    private Integer score;

    @Column(name = "rubric_json", columnDefinition = "text")
    private String rubricJson;

    @Column(columnDefinition = "text")
    private String feedback;

    @Column(name = "model_answer", columnDefinition = "text")
    private String modelAnswer;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public AnswerAttempt(UUID questionId, int attemptNo, String transcript) {
        this.questionId = questionId;
        this.attemptNo = attemptNo;
        this.transcript = transcript;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
