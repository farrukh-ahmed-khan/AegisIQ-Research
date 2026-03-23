import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-5xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Start building research reports with AegisIQ.
        </p>
        <div className="mt-6">
          <SignUp />
        </div>
      </div>
    </main>
  );
}
