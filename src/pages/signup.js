// REFERENCE: https://www.geeksforgeeks.org/reactjs/how-to-connect-mongodb-with-reactjs/

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function SignUp() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const handleOnSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()){
            setError("Name Required");
            return;
        }
        if (!email.trim()){
            setError("Email Required");
            return;
        }
        if (!email.endsWith("ufl.edu")){
            setError("Email must end with ufl.edu")
            return;
        }
        const res = await fetch(`http://localhost:5000/emailverf?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.exists) {
            setError("Email is already registered");
            return;
        }
        setError("");
        let result = await fetch(
        'http://localhost:5000/register', {
            method: "post",
            body: JSON.stringify({ name, email }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        result = await result.json();
        console.warn(result);
        if (result) {
            alert("User Account Made");
            setEmail("");
            setName("");
            navigate("/home");
        }
    }
    return (
        <>
            <h1>This is React WebApp </h1>
                <input type="text" placeholder="name" 
                value={name} onChange={(e) => setName(e.target.value)}/>
                <input type="email" placeholder="ufl email"
                value={email} onChange={(e) => setEmail(e.target.value)}/>
                <button type="submit"
                onClick={handleOnSubmit}>submit</button>
                    {error && <p style={{ color:'red' }}>{error}</p>}
        </>
    );
}