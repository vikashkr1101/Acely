package com.preppal.journey;

import com.preppal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/journey")
@RequiredArgsConstructor
public class JourneyController {

    private final JourneyService journey;

    @GetMapping
    public JourneyDto get(@AuthenticationPrincipal User user) {
        return journey.forUser(user);
    }
}
