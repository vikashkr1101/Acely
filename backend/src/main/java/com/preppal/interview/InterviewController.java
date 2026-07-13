package com.preppal.interview;

import com.preppal.interview.dto.*;
import com.preppal.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviews;

    @PostMapping
    public InterviewDto create(@AuthenticationPrincipal User user, @Valid @RequestBody CreateInterviewRequest req) {
        return interviews.create(user, req);
    }

    @GetMapping
    public List<InterviewDto> list(@AuthenticationPrincipal User user) {
        return interviews.list(user);
    }

    @GetMapping("/{id}")
    public InterviewDto get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return interviews.get(user, id);
    }

    @PostMapping("/{id}/answer")
    public AnswerFeedbackDto answer(@AuthenticationPrincipal User user, @PathVariable UUID id,
                                    @Valid @RequestBody AnswerRequest req) {
        return interviews.answer(user, req);
    }

    @PostMapping("/{id}/nerves")
    public void nerves(@AuthenticationPrincipal User user, @PathVariable UUID id,
                       @Valid @RequestBody NervesRequest req) {
        interviews.recordNerves(user, id, req);
    }

    @PostMapping("/{id}/complete")
    public InterviewDto complete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return interviews.complete(user, id);
    }

    @GetMapping("/{id}/report")
    public ReportDto report(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return interviews.report(user, id);
    }
}
