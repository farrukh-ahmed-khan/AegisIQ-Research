import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export const metadata = {
  title: "AegisIQ Equity Research",
  description: "Automated equity research and analysis platform",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ fontFamily: "Arial, sans-serif", margin: 0 }}>
          <header
            style={{
              padding: "14px 24px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#ffffff",
              position: "sticky",
              top: 0,
              zIndex: 20,
            }}
          >
            <a
              href="/"
              style={{
                textDecoration: "none",
                color: "#0b1f3b",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              AegisIQ Research
            </a>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <a href="/dashboard" style={navLinkStyle}>Dashboard</a>
              <a href="/reports" style={navLinkStyle}>Published</a>

              <SignedOut>
                <SignInButton mode="modal">
                  <button style={signInButtonStyle}>Sign In</button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </header>

          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

const navLinkStyle = {
  textDecoration: "none",
  color: "#0b3d91",
  fontWeight: 700,
};

const signInButtonStyle = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#0b3d91",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
