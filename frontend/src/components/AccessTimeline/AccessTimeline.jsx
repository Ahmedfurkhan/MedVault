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
    <div className="timeline-card">
      <h3>TIMELINE: {title}</h3>
      <div className="timeline-filter">
        <label>
          <span>From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          <span>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
      {filtered.length === 0 ? (
        <p className="timeline-none">No access events in this date range.</p>
      ) : (
        filtered.map((l) => (
          <div key={l._id} className={`timeline-item ${l.isFlagged ? 'flagged' : ''}`}>
            <strong>
              {l.accessorName} ({l.accessorRole})
            </strong>{' '}
            - {new Date(l.timestamp).toLocaleString()}
            <p>
              IP: {l.ipAddress} | Device: {l.device} | Type: {l.accessType}
            </p>
            {l.isFlagged && (
              <div className="timeline-alert">{l.aiExplanation || 'Flagged for review.'}</div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

AccessTimeline.propTypes = { logs: PropTypes.array.isRequired, title: PropTypes.string };
