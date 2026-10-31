/**
 * Root layout — wraps the whole web app in ClerkProvider so sign-in state and
 * getToken() are available everywhere. The same Clerk application backs the mobile app.
 */
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "CRM Platform",
  description: "Configurable stage-based CRM — web + mobile, one backend.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 24, maxWidth: 820 }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
