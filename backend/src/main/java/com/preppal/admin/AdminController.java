package com.preppal.admin;

import com.preppal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Admin-only insights + maintenance. Gated by email (server-enforced) — not just a hidden link. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService admin;

    @Value("${preppal.admin.emails:}")
    private String adminEmailsCsv;

    private void requireAdmin(User user) {
        Set<String> allowed = Arrays.stream(adminEmailsCsv.split(","))
                .map(s -> s.trim().toLowerCase())
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());
        if (user == null || user.getEmail() == null || !allowed.contains(user.getEmail().toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admins only.");
        }
    }

    @GetMapping("/insights")
    public AdminInsightsDto insights(@AuthenticationPrincipal User user) {
        requireAdmin(user);
        return admin.insights();
    }

    @GetMapping("/users")
    public java.util.List<AdminUserRow> users(@AuthenticationPrincipal User user) {
        requireAdmin(user);
        return admin.users();
    }

    @GetMapping("/feedback")
    public AdminFeedbackDto feedback(@AuthenticationPrincipal User user) {
        requireAdmin(user);
        return admin.feedback();
    }

    @PostMapping("/prune-ai-usage")
    public Map<String, Object> pruneAiUsage(@AuthenticationPrincipal User user) {
        requireAdmin(user);
        return Map.of("deleted", admin.pruneAiUsage());
    }
}
