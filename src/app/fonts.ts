import { Fraunces, Public_Sans, JetBrains_Mono } from "next/font/google";

// Display / headings — warm humanist serif (avoids generic AI-slop)
export const fontDisplay = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

// Body / UI — neutral-but-warm, accessible
export const fontSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-brand",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-brand",
});
