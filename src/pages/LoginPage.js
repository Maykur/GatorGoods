import { Show, SignIn } from '@clerk/react';
import { Navigate } from 'react-router-dom';
// REFERENCE: https://cruip.com/toggle-password-visibility-with-tailwind-css-and-nextjs/

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [error, setError] = useState("");
  const [isShown, setShown] = useState(false);
  const toggleShown = () => setShown(prevState => !prevState);
  const handleOnSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()){
      setError("Email Required");
      return;
    }
    if (!password.trim()){
      setError("Password Required");
      return;
    }
    setError("");
    let result = await fetch('http://localhost:5000/login', {
      method: 'post',
      body: JSON.stringify({ email, password }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!result.ok){
      setError("Invalid Email/Password");
      return;
    }      
    alert('User Logged In');
    setEmail('');
    setPass('');
    navigate('/home');
  };
  return (
    <Show when="signed-out" fallback={<Navigate to="/home" replace />}>
      <section className="flex justify-center">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 p-2 shadow-lg shadow-black/20 sm:p-4">
          <SignIn
            path="/login"
            routing="path"
            signUpUrl="/signup"
            fallbackRedirectUrl="/home"
          />
        </div>
      </section>
    </Show>
  );
}
