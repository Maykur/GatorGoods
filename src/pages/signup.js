// REFERENCE: https://www.geeksforgeeks.org/reactjs/how-to-connect-mongodb-with-reactjs/
import { Show, SignUp as ClerkSignUp } from '@clerk/react';
import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';

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
    <Show when="signed-out" fallback={<Navigate to="/home" replace />}>
      <section className="flex justify-center">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 p-2 shadow-lg shadow-black/20 sm:p-4">
          <ClerkSignUp
            path="/signup"
            routing="path"
            signInUrl="/login"
            fallbackRedirectUrl="/home"
          />
        </div>
      </section>
    </Show>
  );
}
