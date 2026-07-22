import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The app itself lives behind auth and has no SEO value — keep it out of the index.
      disallow: [
        "/dashboard",
        "/mock",
        "/reports",
        "/journey",
        "/profile",
        "/admin",
        "/feedback",
        "/verify",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: "https://acely.in/sitemap.xml",
    host: "https://acely.in",
  };
}
