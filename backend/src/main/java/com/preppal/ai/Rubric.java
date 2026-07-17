package com.preppal.ai;

import com.preppal.interview.InterviewType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Scoring rubric for one interview type. dimensions/axisMap are JSON (parsed by the evaluator). */
@Entity
@Table(name = "rubric")
@Getter
@Setter
@NoArgsConstructor
public class Rubric {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private InterviewType type;

    @Column(nullable = false)
    private String label;

    /** JSON: [{"key","label","description"}] — the dimensions this type is scored on. */
    @Column(columnDefinition = "text", nullable = false)
    private String dimensions;

    /** JSON: canonical report axis -> [dimension keys to average]. */
    @Column(name = "axis_map", columnDefinition = "text", nullable = false)
    private String axisMap;

    @Column(name = "top_answer_guidance", columnDefinition = "text", nullable = false)
    private String topAnswerGuidance;

    @Column(name = "band_anchors", columnDefinition = "text", nullable = false)
    private String bandAnchors;

    @Column(name = "prompt_version", nullable = false)
    private String promptVersion;
}
