package com.preppal.user;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Builder.Default
    @Column(nullable = false)
    private String plan = "FREE";   // FREE | PRO

    /** Primary interview TRACK (the readiness benchmark) + STACK (question personalization). */
    @Enumerated(EnumType.STRING)
    @Column(name = "primary_track")
    private com.preppal.interview.InterviewTrack primaryTrack;

    @Column(name = "primary_stack")
    private String primaryStack;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
