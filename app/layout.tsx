import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Works - SimpleLabs",
  description: "SimpleLabs 내부 생산관리 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
