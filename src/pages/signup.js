// REFERENCE: https://www.geeksforgeeks.org/reactjs/how-to-connect-mongodb-with-reactjs/

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [emailVerif, setVerif] = useState(false);

  const checkEmail = async () => {
    const res = await fetch(
      `http://localhost:5000/emailverf?email=${encodeURIComponent(email)}`
    );
    const data = await res.json();
    setVerif(data.exists);

    if (data.exists) {
      setError('Email is already registered');
      return;
    }

    setError('');
  };

  const handleOnSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name required');
      return;
    }

    if (!email.trim()) {
      setError('Email required');
      return;
    }

    if (!email.endsWith('ufl.edu')) {
      setError('Email must end with ufl.edu');
      return;
    }

    if (emailVerif) {
      return;
    }

    setError('');

    let result = await fetch('http://localhost:5000/register', {
      method: 'post',
      body: JSON.stringify({ name, email }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    result = await result.json();
    console.warn(result);

    if (result) {
      alert('User Account Made');
      setEmail('');
      setName('');
      navigate('/home');
    }
  };

  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-black/20 sm:p-8">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
        Join GatorGoods
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-white">
        Create your account
      </h1>
      <p className="mt-3 text-base leading-7 text-slate-300">
        Register with your UF email so marketplace activity stays rooted in the
        campus community.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleOnSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Full name
          </span>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gatorOrange"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">
            UF email
          </span>
          <input
            type="email"
            placeholder="you@ufl.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={checkEmail}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gatorOrange"
          />
        </label>

        {error && (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="inline-flex rounded-full bg-gatorOrange px-5 py-3 font-semibold text-white transition-colors hover:bg-orange-500"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-400">
        Already registered?{' '}
        <Link
          to="/login"
          className="font-semibold text-gatorOrange no-underline transition-colors hover:text-orange-400"
        >
          Log in
        </Link>
        .
      </p>
    </section>
  );
}
