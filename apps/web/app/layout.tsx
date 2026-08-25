import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "TODO",
  description: "個人待辦事項工具",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TODO",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4F46E5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
