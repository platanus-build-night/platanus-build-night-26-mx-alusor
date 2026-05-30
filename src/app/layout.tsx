import {ClerkProvider} from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";
import { fontDisplay, fontSans, fontMono } from "./fonts";

export const metadata: Metadata = {
  title: "DocToApp",
  description:
    "Convierte tus formatos de Word en mini-apps que tus pacientes llenan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable} antialiased`}
    >
      {/* Studio shell is locked to light sage refined-minimal for the hack.
          TODO(theme): add next-themes ThemeProvider + dark toggle later. */}
      <body className="min-h-dvh bg-background text-foreground font-sans">
        <ClerkProvider afterSignOutUrl="/">
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}