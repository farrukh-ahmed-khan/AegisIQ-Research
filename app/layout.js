import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata = {
  title: "AegisIQ Research Platform",
  description: "AI-Powered Institutional Equity Research",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          style={{
            margin: 0,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
            background: "#07111f",
            color: "#ffffff",
            minHeight: "100vh",
          }}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
