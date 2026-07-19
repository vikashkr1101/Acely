package com.preppal.interview;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, UUID> {

    List<InterviewSession> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<InterviewSession> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndCreatedAtAfter(UUID userId, Instant after);

    // ── admin insights ──
    long countByCreatedAtAfter(Instant since);

    long countByStatus(SessionStatus status);

    long countByStatusAndHasEstimatedTrue(SessionStatus status);

    long countByCheckpointTrue();

    @Query("select count(distinct s.userId) from InterviewSession s where s.createdAt >= :since")
    long activeUsersSince(Instant since);

    @Query("""
           select avg(s.overallScore) from InterviewSession s
           where s.status = com.preppal.interview.SessionStatus.COMPLETED and s.overallScore is not null
             and s.hasEstimated = false
             and (s.checkpoint = true or s.scoringMode = com.preppal.interview.ScoringMode.INTERVIEW)""")
    Double avgReadiness();

    @Query("select count(s) from InterviewSession s where s.scoringMode = com.preppal.interview.ScoringMode.INTERVIEW and s.checkpoint = false")
    long countMockInterviews();

    @Query("select s.interviewType, count(s) from InterviewSession s where s.interviewType is not null group by s.interviewType")
    List<Object[]> countByType();

    @Query("select s.role, count(s) from InterviewSession s group by s.role order by count(s) desc")
    List<Object[]> topRoles(Pageable pageable);
}
