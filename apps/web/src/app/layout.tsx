import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AccountProvider } from "@/context/AccountContext";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NadRupee — Instant Escrow Payments for Indian Freelancers",
  description:
    "Instant, escrow-backed payments for Indian freelancers working with global clients — settled on Monad, cashed out to your bank.",
  openGraph: {
    title: "NadRupee — Instant Escrow Payments for Indian Freelancers",
    description: "Get paid the moment work is funded. No wallet required.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <AccountProvider>{children}</AccountProvider>
      </body>
    </html>
  );
}
