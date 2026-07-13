package com.preppal.metric;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** A single captured metric value for a session (e.g. nervousness BEFORE = 8). */
@Entity
@Table(name = "session_metric")
@Getter
@Setter
@NoArgsConstructor
public class SessionMetric {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "metric_key", nullable = false)
    private String metricKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetricPhase phase;

    @Column(nullable = false)
    private BigDecimal value;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public SessionMetric(UUID sessionId, String metricKey, MetricPhase phase, BigDecimal value) {
        this.sessionId = sessionId;
        this.metricKey = metricKey;
        this.phase = phase;
        this.value = value;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
