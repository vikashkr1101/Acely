package com.preppal.ai;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/** One row per AI call — used to monitor free-tier usage and failover behaviour. */
@Entity
@Table(name = "ai_usage")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiUsage {

    @Id
    @UuidGenerator
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AiProvider provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AiOperation operation;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(nullable = false)
    private boolean success;

    @Column(name = "fell_back", nullable = false)
    private boolean fellBack;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(columnDefinition = "text")
    private String error;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
