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
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={submit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
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
