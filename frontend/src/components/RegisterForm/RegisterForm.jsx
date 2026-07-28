import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './RegisterForm.css';
import API_BASE from '../../apiBase';

export default function RegisterForm({ onRegister, onNav }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else onRegister(data);
  };

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <p className="eyebrow">Create your account</p>
        <h3>Start protecting your records</h3>
        <p className="auth-subtitle">
          Register once and begin tracking access transparency in real time.
        </p>
      </div>
      {error && (
        <p className="auth-error" id="register-error" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="register-name">
          Full name
        </label>
        <input
          id="register-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          autoComplete="name"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'register-error' : undefined}
        />
        <label className="sr-only" htmlFor="register-email">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'register-error' : undefined}
        />
        <label className="sr-only" htmlFor="register-password">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (at least 6 characters)"
          autoComplete="new-password"
          minLength={6}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'register-error' : undefined}
        />
        <button type="submit">Register</button>
      </form>
      <button type="button" onClick={onNav} className="secondary-link">
        Sign In
      </button>
    </div>
  );
}
RegisterForm.propTypes = {
  onRegister: PropTypes.func.isRequired,
  onNav: PropTypes.func.isRequired,
};
