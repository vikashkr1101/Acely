import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PrepPal — Practice until you're interview-ready",
    template: "%s · PrepPal",
  },
  description:
    "Free, private AI mock interviews that get you interview-ready — honest feedback, a real readiness score, and a clear next step every time.",
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
