import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "bash.wasm",
  description: "Run bash in the browser via WebAssembly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${mono.variable} h-full antialiased`}>
      <head>
        {/* eslint-disable -- ignore bash code */}
        <script defer type="text/bash">
          web "dom.write" "#hello" "howdy from script tag"
        </script>
        {/* eslint-enable */}
        <script src="jonrose.sh" defer type="text/bash" />
        <script src="bash.js" defer />
        <script src="bashLoader.js" type="module" defer />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
