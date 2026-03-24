import "./globals.css";
import { Outfit } from "next/font/google";
import SiteNavbar from "../components/navbar/Navbar";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });

export const metadata = {
  title: "AegisIQ Equity Research",
  description: "Automated equity research and analysis platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className} suppressHydrationWarning>
        <SiteNavbar />
        {children}
      </body>
    </html>
  );
}
