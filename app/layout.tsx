import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fact Checker",
  description: "Check if a claim is true, false, or an AI-generated hoax."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="w-full max-w-3xl">{children}</div>
        </main>
      </body>
    </html>
  );
}

