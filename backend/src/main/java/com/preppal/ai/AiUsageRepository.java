package com.preppal.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AiUsageRepository extends JpaRepository<AiUsage, UUID> {

    long countByCreatedAtBefore(Instant cutoff);

    /** Retention prune — drop rows older than the cutoff. Returns how many were deleted. */
    @Modifying
    @Transactional
    int deleteByCreatedAtBefore(Instant cutoff);

    @Query("select min(u.createdAt) from AiUsage u")
    Instant oldest();

    /** provider, calls, successes, fallbacks — since a cutoff (for the admin provider-health table). */
    @Query("""
           select u.provider, count(u),
                  sum(case when u.success then 1 else 0 end),
                  sum(case when u.fellBack then 1 else 0 end)
           from AiUsage u where u.createdAt >= :since group by u.provider""")
    List<Object[]> providerHealth(Instant since);
}
