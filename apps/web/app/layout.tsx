import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TODO",
  description: "個人待辦事項工具",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
