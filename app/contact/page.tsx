export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-slate-900">Contact</h1>
      <p className="mt-4 text-lg text-slate-600">
        Have questions or want a demo? Share a few details and we will follow up.
      </p>

      <form className="mt-8 grid gap-4 rounded-2xl border border-slate-200 p-6 shadow-sm">
        <input
          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm"
          placeholder="Full name"
          type="text"
        />
        <input
          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm"
          placeholder="Work email"
          type="email"
        />
        <textarea
          className="min-h-[120px] w-full rounded-lg border border-slate-200 px-4 py-3 text-sm"
          placeholder="How can we help?"
        />
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Send message
        </button>
      </form>
    </main>
  );
}
