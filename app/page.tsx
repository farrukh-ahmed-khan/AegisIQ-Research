
export default function HomePage() {
  return (
    <main style={{padding:"60px", maxWidth:"900px", margin:"auto"}}>
      <h1 style={{fontSize:"40px"}}>AegisIQ Equity Analysis & Research</h1>
      <p style={{fontSize:"18px"}}>
        Automated AI platform for institutional-grade equity research reports.
      </p>

      <div style={{marginTop:"40px"}}>
        <h2>Generate Research</h2>
        <p>Enter a ticker to generate a full equity research report.</p>
        <input placeholder="AAPL" style={{padding:"10px", fontSize:"16px"}} />
      </div>
    </main>
  )
}
