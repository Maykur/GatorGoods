import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-black/20 sm:p-8">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
        Account Access
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-white">Log in</h1>
      <p className="mt-3 text-base leading-7 text-slate-300">
        Sign in to your GatorGoods account. Full authentication wiring is the
        next step, but this page now matches the shared app shell.
      </p>

      <form className="mt-8 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">
            UF email
          </span>
          <input
            type="email"
            placeholder="you@ufl.edu"
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gatorOrange"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Password
          </span>
          <input
            type="password"
            placeholder="Enter your password"
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gatorOrange"
          />
        </label>

        <button
          type="button"
          className="inline-flex rounded-full bg-gatorOrange px-5 py-3 font-semibold text-white transition-colors hover:bg-orange-500"
        >
          Log in
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-400">
        Need an account?{' '}
        <Link
          to="/signup"
          className="font-semibold text-gatorOrange no-underline transition-colors hover:text-orange-400"
        >
          Create one here
        </Link>
        .
      </p>
    </section>
  );
}
