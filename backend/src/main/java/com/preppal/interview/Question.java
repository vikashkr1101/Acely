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

    public Question(int ordinal, String questionText) {
        this.ordinal = ordinal;
        this.questionText = questionText;
    }

    public boolean isAnswered() {
        return answerTranscript != null;
    }
}
