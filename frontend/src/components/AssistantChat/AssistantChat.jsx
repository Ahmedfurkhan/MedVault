import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './AssistantChat.css';
import API_BASE from '../../apiBase';

export default function AssistantChat({ suggestions = [] }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const endRef = useRef(null);

  // Focus the composer on open so people can start typing immediately.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the newest message in view, like a normal chat app.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

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
      <h2 className="sr-only">AI access assistant</h2>

      <div className="assistant-messages" role="log" aria-live="polite" aria-label="Conversation">
        {messages.length === 0 && (
          <div className="assistant-empty">
            <div className="assistant-empty-icon" aria-hidden="true">
              💬
            </div>
            <p className="assistant-empty-title">Ask about who accessed your records</p>
            <p className="assistant-empty-sub">
              Answers come only from your own access history. Pick a question, or type your own
              below.
            </p>
            <div className="assistant-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => send(s)}
                  disabled={loading}
                >
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
          <div className="chat-row assistant" role="status">
            <div className="chat-avatar" aria-hidden="true">
              🛡️
            </div>
            <div className="chat-bubble assistant loading">
              <span className="sr-only">Assistant is typing…</span>
              <span className="typing-dot" aria-hidden="true"></span>
              <span className="typing-dot" aria-hidden="true"></span>
              <span className="typing-dot" aria-hidden="true"></span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor="assistant-input">
          Ask a question about your record access
        </label>
        <input
          id="assistant-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the access assistant…"
        />
        <button type="submit" disabled={loading} aria-label="Send message">
          Send
        </button>
      </form>
    </div>
  );
}

AssistantChat.propTypes = {
  suggestions: PropTypes.arrayOf(PropTypes.string),
};
