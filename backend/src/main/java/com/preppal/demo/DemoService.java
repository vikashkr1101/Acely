package com.preppal.demo;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DemoService {

    /** Guided-tour length — keep in sync with STEPS in frontend/src/components/demo/DemoTour.tsx. */
    public static final int TOUR_STEPS = 6;
    private static final Set<String> EVENTS = Set.of("open", "step", "complete", "skip", "bts", "gate", "signup", "login");

    private final DemoVisitRepository visits;

    /** A ping from the demo page. Returns false when the payload is malformed (silently ignored). */
    @Transactional
    public boolean record(DemoTrackRequest r) {
        if (r == null || r.event() == null || !EVENTS.contains(r.event())) return false;
        UUID visitId = uuid(r.visitId());
        UUID visitorId = uuid(r.visitorId());
        if (visitId == null || visitorId == null) return false;

        String e = r.event();
        int step = switch (e) {
            // Out-of-range steps are ignored, not clamped — a forged 999 must not count as "finished the tour".
            case "step" -> r.step() != null && r.step() >= 1 && r.step() <= TOUR_STEPS ? r.step() : 0;
            case "complete" -> TOUR_STEPS;
            default -> 0;
        };
        visits.upsert(visitId, visitorId, cleanSource(r.source()), Boolean.TRUE.equals(r.mobile()), step,
                e.equals("complete"), e.equals("skip"), e.equals("bts"), e.equals("gate"),
                e.equals("signup"), e.equals("login"));
        return true;
    }

    @Transactional(readOnly = true)
    public DemoStatsDto stats() {
        Instant now = Instant.now();
        Instant d30 = now.minus(Duration.ofDays(30));
        DemoStatsDto.Window w7 = window(now.minus(Duration.ofDays(7)));
        DemoStatsDto.Window w30 = window(d30);
        DemoStatsDto.Window all = window(Instant.EPOCH);

        List<Long> funnel = visits.funnelSince(d30, TOUR_STEPS).stream().map(row -> num(row[1])).toList();
        List<DemoStatsDto.Count> sources = visits.sourcesSince(d30).stream()
                .map(row -> new DemoStatsDto.Count((String) row[0], num(row[1]))).toList();
        List<DemoStatsDto.Day> daily = visits.dailyOpens(14).stream()
                .map(row -> new DemoStatsDto.Day(day(row[0]), num(row[1]))).toList();
        int mobilePct = w30.visits() == 0 ? 0 : (int) Math.round(100.0 * visits.mobileSince(d30) / w30.visits());
        List<DemoStatsDto.Visit> recent = visits.findTop25ByOrderByCreatedAtDesc().stream()
                .map(v -> new DemoStatsDto.Visit(v.getCreatedAt(), v.getSource(), v.isMobile(), v.getMaxStep(),
                        v.isCompleted(), v.isOpenedBts(), v.isHitGate(), v.isClickedSignup()))
                .toList();
        return new DemoStatsDto(w7, w30, all, TOUR_STEPS, funnel, sources, daily, mobilePct, recent);
    }

    private DemoStatsDto.Window window(Instant since) {
        Object[] t = visits.totalsSince(since).get(0);
        return new DemoStatsDto.Window(num(t[0]), num(t[1]), num(t[2]), num(t[3]), num(t[4]), num(t[5]));
    }

    private static long num(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }
    private static String day(Object o) {
        if (o instanceof Date d) return d.toLocalDate().toString();
        if (o instanceof java.time.LocalDate d) return d.toString();
        return String.valueOf(o);
    }
    private static UUID uuid(String s) {
        try {
            return s == null ? null : UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
    /** Keep only a short, printable label (it's shown in the admin page). */
    private static String cleanSource(String s) {
        if (s == null) return null;
        String c = s.trim().replaceAll("[^A-Za-z0-9._\\-]", "").toLowerCase();
        if (c.isEmpty()) return null;
        return c.length() > 60 ? c.substring(0, 60) : c;
    }
}
