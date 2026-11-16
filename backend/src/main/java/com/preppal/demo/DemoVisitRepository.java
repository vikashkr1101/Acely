package com.preppal.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface DemoVisitRepository extends JpaRepository<DemoVisit, UUID> {

    /**
     * Atomic upsert — a visit's pings can arrive concurrently (the beacon API fires and forgets), so a
     * read-then-insert would race. Flags only ever turn on, max_step only grows, the first source wins.
     */
    @Modifying
    @Query(nativeQuery = true, value = """
            insert into demo_visits (id, visitor_id, source, mobile, max_step, completed, skipped,
                                     opened_bts, hit_gate, clicked_signup, clicked_login, created_at, last_seen_at)
            values (:id, :visitorId, :source, :mobile, :step, :completed, :skipped,
                    :bts, :gate, :signup, :login, now(), now())
            on conflict (id) do update set
                last_seen_at   = now(),
                source         = coalesce(demo_visits.source, excluded.source),
                mobile         = demo_visits.mobile or excluded.mobile,
                max_step       = greatest(demo_visits.max_step, excluded.max_step),
                completed      = demo_visits.completed or excluded.completed,
                skipped        = demo_visits.skipped or excluded.skipped,
                opened_bts     = demo_visits.opened_bts or excluded.opened_bts,
                hit_gate       = demo_visits.hit_gate or excluded.hit_gate,
                clicked_signup = demo_visits.clicked_signup or excluded.clicked_signup,
                clicked_login  = demo_visits.clicked_login or excluded.clicked_login
            """)
    void upsert(@Param("id") UUID id, @Param("visitorId") UUID visitorId, @Param("source") String source,
                @Param("mobile") boolean mobile, @Param("step") int step,
                @Param("completed") boolean completed, @Param("skipped") boolean skipped,
                @Param("bts") boolean bts, @Param("gate") boolean gate,
                @Param("signup") boolean signup, @Param("login") boolean login);

    /** [visits, unique visitors, completed tour, opened BTS, hit sign-up prompt, clicked sign-up] since the cutoff. */
    @Query(nativeQuery = true, value = """
            select count(*), count(distinct visitor_id),
                   count(*) filter (where completed), count(*) filter (where opened_bts),
                   count(*) filter (where hit_gate), count(*) filter (where clicked_signup)
            from demo_visits where created_at >= :since
            """)
    List<Object[]> totalsSince(@Param("since") Instant since);

    /** Visits since the cutoff that reached at least each tour step (index 0 = step 1). */
    @Query(nativeQuery = true, value = """
            select s.n, count(v.id)
            from generate_series(1, :steps) as s(n)
            left join demo_visits v on v.max_step >= s.n and v.created_at >= :since
            group by s.n order by s.n
            """)
    List<Object[]> funnelSince(@Param("since") Instant since, @Param("steps") int steps);

    @Query(nativeQuery = true, value = """
            select coalesce(source, 'direct') src, count(*) c from demo_visits
            where created_at >= :since group by src order by c desc limit 8
            """)
    List<Object[]> sourcesSince(@Param("since") Instant since);

    /** Opens per day for the last :days days (oldest first), zero-filled. */
    @Query(nativeQuery = true, value = """
            select d::date, count(v.id)
            from generate_series(date_trunc('day', now()) - make_interval(days => :days - 1),
                                 date_trunc('day', now()), interval '1 day') as d
            left join demo_visits v on date_trunc('day', v.created_at) = d
            group by d order by d
            """)
    List<Object[]> dailyOpens(@Param("days") int days);

    @Query(nativeQuery = true, value = "select count(*) from demo_visits where mobile and created_at >= :since")
    long mobileSince(@Param("since") Instant since);

    List<DemoVisit> findTop25ByOrderByCreatedAtDesc();
}
