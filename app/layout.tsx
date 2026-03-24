import "./globals.css";
import { Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import SiteNavbar from "../components/navbar/Navbar";
import Footer from "@/components/Footer/Footer";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "AegisIQ Equity Research",
  description: "Automated equity research and analysis platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={outfit.className} suppressHydrationWarning>
        <ClerkProvider>
          <SiteNavbar />
          {children}
          <Footer />
        </ClerkProvider>
      </body>
    </html>
  );
}
