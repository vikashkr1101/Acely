package com.preppal.feedback;

import com.preppal.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackRepository feedback;

    public record FeedbackRequest(
            @Min(1) @Max(5) Integer rating,
            @NotNull FeedbackCategory category,
            @Size(max = 2000) String message,
            UUID sessionId) {
    }

    @PostMapping
    public void submit(@AuthenticationPrincipal User user, @Valid @RequestBody FeedbackRequest req) {
        Feedback f = new Feedback();
        f.setUserId(user.getId());
        f.setSessionId(req.sessionId());
        f.setRating(req.rating());
        f.setCategory(req.category());
        f.setMessage(req.message() == null || req.message().isBlank() ? null : req.message().trim());
        feedback.save(f);
    }
}
