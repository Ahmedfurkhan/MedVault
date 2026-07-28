import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './AccessTimeline.css';

export default function AccessTimeline({ logs, title }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Reset the date range whenever a different record is opened.
  useEffect(() => {
    setFrom('');
    setTo('');
  }, [title]);

  if (!title)
    return <div className="timeline-empty">Select a record on the left to view timeline.</div>;

  const filtered = logs.filter((l) => {
    const t = new Date(l.timestamp);
    if (from && t < new Date(from)) return false;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (t > end) return false;
    }
    return true;
  });

  return (
    <section className="timeline-card" aria-labelledby="timeline-heading">
      <h3 id="timeline-heading">Access timeline: {title}</h3>
      <div className="timeline-filter">
        <label htmlFor="timeline-from">
          <span>From</span>
          <input
            id="timeline-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label htmlFor="timeline-to">
          <span>To</span>
          <input id="timeline-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {(from || to) && (
          <button
            type="button"
            className="timeline-clear"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
          >
            Clear
          </button>
        )}
      </div>
      <div aria-live="polite">
        {filtered.length === 0 ? (
          <p className="timeline-none">No access events in this date range.</p>
        ) : (
          <ul className="timeline-list">
            {filtered.map((l) => (
              <li key={l._id} className={`timeline-item ${l.isFlagged ? 'flagged' : ''}`}>
                {l.isFlagged && <span className="sr-only">Flagged access event. </span>}
                <strong>
                  {l.accessorName} ({l.accessorRole})
                </strong>{' '}
                - {new Date(l.timestamp).toLocaleString()}
                <p>
                  IP: {l.ipAddress} | Device: {l.device} | Type: {l.accessType}
                </p>
                {l.isFlagged && (
                  <p className="timeline-alert" role="note">
                    <span className="timeline-alert-icon" aria-hidden="true">
                      ⚠️
                    </span>{' '}
                    {l.aiExplanation || 'Flagged for review.'}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

AccessTimeline.propTypes = { logs: PropTypes.array.isRequired, title: PropTypes.string };
