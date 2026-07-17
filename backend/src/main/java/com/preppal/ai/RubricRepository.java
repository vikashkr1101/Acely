package com.preppal.ai;

import com.preppal.interview.InterviewType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RubricRepository extends JpaRepository<Rubric, InterviewType> {
}
