package com.preppal.feedback;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    @Query("select avg(f.rating) from Feedback f where f.rating is not null")
    Double avgRating();

    long countByCreatedAtAfter(Instant since);

    /** rating, category, message, createdAt, user name — newest first (for the admin panel). */
    @Query("select f.rating, f.category, f.message, f.createdAt, u.name "
            + "from Feedback f, com.preppal.user.User u where u.id = f.userId order by f.createdAt desc")
    List<Object[]> recentWithUser(Pageable pageable);
}
