import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vascular CPT Coding Assistant",
  description: "CPT code search, wRVU calculator, and operative report generator for vascular surgeons",
  keywords: ["CPT codes", "vascular surgery", "wRVU", "medical coding", "operative reports"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
