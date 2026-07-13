package com.preppal.interview;

import com.preppal.interview.dto.ReportSummary;
import com.preppal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportsController {

    private final InterviewService interviews;

    @GetMapping
    public List<ReportSummary> list(@AuthenticationPrincipal User user) {
        return interviews.reportList(user);
    }
}
