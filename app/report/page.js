export default function ReportIndexPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #07111f 0%, #0b1f3b 45%, #123d6b 100%)",
        color: "white",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 700,
          padding: 28,
          borderRadius: 20,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h1>AegisIQ Report Requests</h1>
        <p>
          Submit a new ticker and Excel history upload from the homepage, then
          open the generated request summary page.
        </p>
      </div>
    </main>
  );
}
