package com.preppal.interview;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnswerAttemptRepository extends JpaRepository<AnswerAttempt, UUID> {
    int countByQuestionId(UUID questionId);

    List<AnswerAttempt> findByQuestionIdOrderByAttemptNoAsc(UUID questionId);
}
