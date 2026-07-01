import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Elite Risk",
  description: "Elite Risk Advisory",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
