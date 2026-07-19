package com.preppal.feedback;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "feedback")
@Getter
@Setter
@NoArgsConstructor
public class Feedback {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** The session this feedback is about (interview card); null for general feedback. */
    @Column(name = "session_id")
    private UUID sessionId;

    /** 1..5; nullable — a written message alone is valid. */
    private Integer rating;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FeedbackCategory category;

    @Column(columnDefinition = "text")
    private String message;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
