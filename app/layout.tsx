
export const metadata = {
  title: "AegisIQ Equity Research",
  description: "Automated equity research and analysis platform"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{fontFamily:"Arial, sans-serif", margin:0}}>
        {children}
      </body>
    </html>
  )
}
