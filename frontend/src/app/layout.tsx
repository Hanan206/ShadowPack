import type { Metadata } from "next";
import { Space_Grotesk, Crimson_Text } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson-text",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "ShadowPack — AI Werewolf on OneChain",
  description:
    "Six AI agents. One blockchain. Trust no one. ShadowPack is an on-chain social deduction game powered by AI personalities on OneChain.",
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${crimsonText.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
