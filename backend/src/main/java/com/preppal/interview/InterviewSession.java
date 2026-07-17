package com.preppal.interview;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "interview_sessions")
@Getter
@Setter
@NoArgsConstructor
public class InterviewSession {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String role;

    @Column(columnDefinition = "text")
    private String jd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterviewMode mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status = SessionStatus.IN_PROGRESS;

    @Column(name = "overall_score")
    private Integer overallScore;

    @Column(columnDefinition = "text")
    private String summary;

    // ── engine fields (Phase 1; nullable so legacy sessions stay valid) ──
    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type")
    private InterviewType interviewType;

    @Enumerated(EnumType.STRING)
    @Column(name = "experience_level")
    private ExperienceLevel experienceLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_mode")
    private EntryMode entryMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "scoring_mode")
    private ScoringMode scoringMode;

    @Column(name = "prompt_version")
    private String promptVersion;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordinal ASC")
    private List<Question> questions = new ArrayList<>();

    public InterviewSession(UUID userId, String role, String jd, InterviewMode mode) {
        this.userId = userId;
        this.role = role;
        this.jd = jd;
        this.mode = mode;
    }

    public void addQuestion(Question q) {
        q.setSession(this);
        questions.add(q);
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = SessionStatus.IN_PROGRESS;
    }
}
