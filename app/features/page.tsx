export default function FeaturesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-slate-900">Features</h1>
      <p className="mt-4 text-lg text-slate-600">
        AegisIQ helps teams generate institutional-grade equity research faster
        with automated data ingestion, analysis, and report generation.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Research Studio</h3>
          <p className="mt-2 text-sm text-slate-600">
            Guided workflows for thesis building, peer comps, and investment memos.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Auto-Generated PDFs</h3>
          <p className="mt-2 text-sm text-slate-600">
            Export clean, brand-ready research reports in minutes.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Team Workspace</h3>
          <p className="mt-2 text-sm text-slate-600">
            Share notes, upload documents, and keep analysis centralized.
          </p>
        </div>
      </div>
    </main>
  );
}
