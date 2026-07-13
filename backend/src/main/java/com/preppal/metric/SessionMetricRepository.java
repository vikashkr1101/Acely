package com.preppal.metric;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface SessionMetricRepository extends JpaRepository<SessionMetric, UUID> {
    List<SessionMetric> findBySessionId(UUID sessionId);

    List<SessionMetric> findBySessionIdIn(Collection<UUID> sessionIds);
}
