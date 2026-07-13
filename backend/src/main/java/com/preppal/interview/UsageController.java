package com.preppal.interview;

import com.preppal.interview.dto.UsageDto;
import com.preppal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class UsageController {

    private final InterviewService interviews;

    @GetMapping("/usage")
    public UsageDto usage(@AuthenticationPrincipal User user) {
        return interviews.usage(user);
    }
}
