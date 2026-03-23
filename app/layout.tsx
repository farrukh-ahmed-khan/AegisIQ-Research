
import "./globals.css";
import SiteNavbar from "../components/site-navbar";

export const metadata = {
  title: "AegisIQ Equity Research",
  description: "Automated equity research and analysis platform"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        style={{fontFamily:"Arial, sans-serif", margin:0}}
      >
        <SiteNavbar />
        {children}
      </body>
    </html>
  )
}
