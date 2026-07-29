import type { Metadata } from "next";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "Storyverse",
  description: "Collaborative visual storytelling with versioned worlds and AI-assisted continuity.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Dark is the shipping theme. The light token set exists so nothing
    // hardcodes a hex, but it is not QA'd for the hackathon build.
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-sv-overlay !border-sv-edge !text-sv-text !rounded-md !shadow-[var(--shadow-l2)]",
              description: "!text-sv-muted",
              actionButton: "!bg-sv-accent !text-sv-invert",
              cancelButton: "!bg-sv-raised !text-sv-muted",
            },
          }}
        />
      </body>
    </html>
  );
}
