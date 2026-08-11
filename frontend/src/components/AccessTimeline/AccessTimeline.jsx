import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './AccessTimeline.css';

// Turn a raw browser user-agent (or an already-friendly seed value) into a
// short, human phrase like "Chrome on Windows" so patients aren't shown a wall
// of technical text.
function friendlyDevice(ua) {
  if (!ua) return 'an unknown device';
  // Seed data already stores friendly names (no user-agent markers).
  if (!/mozilla|applewebkit|gecko|chrome|safari|firefox|edg|electron/i.test(ua)) return ua;

  let browser = 'a web browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/electron|code\//i.test(ua)) browser = 'a desktop app';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';

  let os = '';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ios/i.test(ua)) os = 'iPhone/iPad';
  else if (/mac os|macintosh/i.test(ua)) os = 'Mac';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  return os ? `${browser} on ${os}` : browser;
}

// "Aug 7, 2026 at 1:31 PM"
function friendlyWhen(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} at ${time}`;
}

export default function AccessTimeline({ logs, title }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const cardRef = useRef(null);

  // Reset the date range whenever a different record is opened.
  useEffect(() => {
    setFrom('');
    setTo('');
  }, [title]);

  // On mobile the timeline sits below a long record list, so scroll it into view
  // when a record is opened. Re-runs when its events load so it lands on the
  // populated card, not the momentary empty state.
  useEffect(() => {
    if (!title || typeof window === 'undefined') return undefined;
    if (!window.matchMedia('(max-width: 900px)').matches) return undefined;
    const t = setTimeout(
      () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      60
    );
    return () => clearTimeout(t);
  }, [title, logs]);

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
    <section className="timeline-card" aria-labelledby="timeline-heading" ref={cardRef}>
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
                <p className="timeline-who">
                  <strong>{l.accessorName}</strong>
                  {l.accessorRole ? (
                    <span className="timeline-role"> · {l.accessorRole}</span>
                  ) : null}
                </p>
                <p className="timeline-detail">
                  {l.accessType === 'view' ? 'Viewed your record' : 'Accessed your record'} on{' '}
                  {friendlyWhen(l.timestamp)}
                </p>
                <p className="timeline-detail timeline-device">Using {friendlyDevice(l.device)}</p>
                {l.isFlagged && (
                  <p className="timeline-alert" role="note">
                    <span className="timeline-alert-icon" aria-hidden="true">
                      ⚠️
                    </span>{' '}
                    {l.aiExplanation ||
                      'This access looked unusual — review it and contact your provider if you don’t recognize it.'}
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
