import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './AssistantChat.css';
import API_BASE from '../../apiBase';

export default function AssistantChat({ suggestions = [] }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assistant`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.answer || data.error || 'No response.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assistant-card">
      <div className="assistant-header">
        <p className="eyebrow">AI Access Assistant</p>
        <h3>Ask about who accessed your records</h3>
        <p className="assistant-subtitle">
          Answers are grounded only in your own access history — the assistant never makes up
          events.
        </p>
      </div>

      <div className="assistant-messages">
        {messages.length === 0 && (
          <div className="assistant-empty">
            <p>Try asking:</p>
            <div className="assistant-suggestions">
              {suggestions.map((s) => (
                <button key={s} type="button" className="suggestion-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={`${m.role}-${i}`} className={`chat-row ${m.role}`}>
            <div className="chat-avatar" aria-hidden="true">
              {m.role === 'user' ? '🧑' : '🛡️'}
            </div>
            <div className={`chat-bubble ${m.role}`}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-row assistant">
            <div className="chat-avatar" aria-hidden="true">
              🛡️
            </div>
            <div className="chat-bubble assistant loading">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
      </div>

      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your record access…"
          aria-label="Ask the access assistant"
        />
        <button type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}

AssistantChat.propTypes = {
  suggestions: PropTypes.arrayOf(PropTypes.string),
};
