package com.preppal.demo;

/** Body of a demo ping (sent as text/plain JSON, see DemoController). Every field is untrusted input. */
public record DemoTrackRequest(
        String visitId,
        String visitorId,
        String event,
        Integer step,
        String source,
        Boolean mobile) {
}
