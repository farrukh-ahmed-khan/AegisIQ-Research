import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function PricingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 40,
        background: "linear-gradient(135deg,#07111f,#0b1f3b,#123d6b)",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 24 }}>
        <section style={heroStyle}>
          <div style={badgeStyle}>AegisIQ Pricing</div>
          <h1 style={{ margin: "12px 0 8px 0", fontSize: 42 }}>Choose your research plan</h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.84)", fontSize: 18 }}>
            Launch with single reports or upgrade to a recurring research workflow.
          </p>
        </section>

        <section style={gridStyle}>
          <PricingCard
            title="Single Report"
            price="$49"
            description="One full equity research workflow for a single ticker."
            priceIdEnv="NEXT_PUBLIC_STRIPE_PRICE_SINGLE"
          />

          <PricingCard
            title="Pro Monthly"
            price="$199/mo"
            description="Recurring access for active research and dashboard usage."
            priceIdEnv="NEXT_PUBLIC_STRIPE_PRICE_PRO"
          />

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, fontSize: 28, color: "#0b1f3b" }}>Institutional</h3>
            <p style={{ fontSize: 34, fontWeight: 800, color: "#0b3d91", margin: "10px 0" }}>
              Custom
            </p>
            <p style={{ color: "#24364f", lineHeight: 1.7 }}>
              Team deployment, branded reporting, API workflow, and enterprise setup.
            </p>
            <a href="/" style={contactLinkStyle}>Contact AegisIQ</a>
          </div>
        </section>
      </div>
    </main>
  );
}

function PricingCard({ title, price, description, priceIdEnv }) {
  async function handleCheckout() {
    const priceId = process.env[priceIdEnv];
    const res = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ priceId }),
    });

    const json = await res.json();
    if (json.url) window.location.href = json.url;
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, fontSize: 28, color: "#0b1f3b" }}>{title}</h3>
      <p style={{ fontSize: 34, fontWeight: 800, color: "#0b3d91", margin: "10px 0" }}>
        {price}
      </p>
      <p style={{ color: "#24364f", lineHeight: 1.7 }}>{description}</p>

      <SignedOut>
        <SignInButton mode="modal">
          <button style={buttonStyle}>Sign in to continue</button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <button style={buttonStyle} onClick={handleCheckout}>
          Continue
        </button>
      </SignedIn>
    </div>
  );
}

const heroStyle = {
  borderRadius: 20,
  padding: 30,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
};

const badgeStyle = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 20,
};

const cardStyle = {
  background: "white",
  color: "#0b1f3b",
  padding: 28,
  borderRadius: 18,
  boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
};

const buttonStyle = {
  marginTop: 16,
  padding: "12px 18px",
  fontSize: 16,
  background: "#0b3d91",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const contactLinkStyle = {
  display: "inline-block",
  marginTop: 16,
  color: "#0b3d91",
  fontWeight: 700,
  textDecoration: "none",
};
