import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const DESC =
  "Free, private AI mock interviews that get you interview-ready — honest feedback, a real readiness score, and a clear next step every time.";

export const metadata: Metadata = {
  metadataBase: new URL("https://acely.in"),
  title: {
    default: "Acely — Practice until you're interview-ready",
    template: "%s · Acely",
  },
  description: DESC,
  applicationName: "Acely",
  keywords: [
    "AI mock interview",
    "mock interview for freshers",
    "interview practice for students",
    "technical interview practice",
    "HR interview questions",
    "behavioral interview practice",
    "free interview preparation",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://acely.in",
    siteName: "Acely",
    title: "Acely — Practice until you're interview-ready",
    description: DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: "Acely — Practice until you're interview-ready",
    description: DESC,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} antialiased`} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=sessionStorage.getItem('ppl_theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
