package com.preppal.interview;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, UUID> {

    List<InterviewSession> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<InterviewSession> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndCreatedAtAfter(UUID userId, Instant after);
}
