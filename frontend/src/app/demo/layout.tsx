import type { Metadata } from "next";
import "@/components/demo/demo.css";
import { DemoChrome } from "@/components/demo/DemoChrome";

const TITLE = "Acely live demo: a real AI-scored interview journey";
const DESC =
  "No sign-up. Explore a real candidate's readiness score, graded answers with evidence, a retry that " +
  "went from 58 to 91, and progress over time. Takes under a minute.";

export const metadata: Metadata = {
  title: "Live demo",
  description: DESC,
  alternates: { canonical: "/demo" },
  openGraph: { type: "website", url: "https://acely.in/demo", siteName: "Acely", title: TITLE, description: DESC },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoChrome>{children}</DemoChrome>;
}
