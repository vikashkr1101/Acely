package com.preppal.demo;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/** One anonymous visit to the static demo (see V18__demo_visits.sql). Written only via the upsert. */
@Entity
@Table(name = "demo_visits")
@Getter
@NoArgsConstructor
public class DemoVisit {

    @Id
    private UUID id;

    @Column(name = "visitor_id", nullable = false)
    private UUID visitorId;

    private String source;
    private boolean mobile;

    @Column(name = "max_step")
    private int maxStep;

    private boolean completed;
    private boolean skipped;

    @Column(name = "opened_bts")
    private boolean openedBts;

    @Column(name = "hit_gate")
    private boolean hitGate;

    @Column(name = "clicked_signup")
    private boolean clickedSignup;

    @Column(name = "clicked_login")
    private boolean clickedLogin;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;
}
