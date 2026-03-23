export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-slate-900">About AegisIQ</h1>
      <p className="mt-4 text-lg text-slate-600">
        We build AI-driven tools for analysts, investors, and research teams who
        need reliable insights without the manual grind.
      </p>
      <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Our Mission</h2>
        <p className="mt-3 text-sm text-slate-600">
          Deliver institutional-grade equity research at startup speed with
          trusted data, explainable insights, and modern workflows.
        </p>
      </div>
    </main>
  );
}
