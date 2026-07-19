package com.preppal.interview;

/**
 * The kind of company the candidate is prepping for — Indian interview styles differ sharply between
 * product, IT-services, and startup. Shapes the generation prompt (not a benchmark, just flavour).
 */
public enum CompanyType {
    PRODUCT, SERVICE, STARTUP, GENERAL;

    public static CompanyType orGeneral(CompanyType c) {
        return c == null ? GENERAL : c;
    }

    /** Prompt guidance appended to generation; empty for GENERAL. */
    public String guidance() {
        return switch (this) {
            case PRODUCT -> "Style the questions like a PRODUCT company (Google / Amazon / Flipkart): "
                    + "problem-solving depth, reasoning and trade-offs, and how the candidate thinks — not rote facts.";
            case SERVICE -> "Style the questions like an IT-SERVICES company (TCS / Infosys / Wipro): "
                    + "solid fundamentals (OOP, DBMS, SQL), clear communication, and process awareness.";
            case STARTUP -> "Style the questions like a STARTUP (Swiggy / Razorpay / Zomato): "
                    + "practical hands-on project experience, ownership, adaptability, and shipping quickly.";
            case GENERAL -> "";
        };
    }
}
