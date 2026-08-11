import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import RecordModal from '../RecordModal/RecordModal';
import './RecordList.css';

export default function RecordList({ records, onSelect, activeId, onRefresh, isSearching }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState('');

  // Clear the confirmation message a few seconds after it appears.
  useEffect(() => {
    if (!status) return undefined;
    const timer = setTimeout(() => setStatus(''), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const handleSaved = (message) => {
    onRefresh();
    if (message) setStatus(message);
  };

  return (
    <div>
      <div className="record-list-header">
        <h3>MY RECORDS</h3>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModal(true);
          }}
        >
          + Add
        </button>
      </div>
      <p className="record-status" role="status" aria-live="polite">
        {status}
      </p>
      {records.length === 0 ? (
        isSearching ? (
          <div className="empty-state">
            <h3>No matching records</h3>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No records yet</h3>
            <p>Add your first medical record to begin tracking who accesses it.</p>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModal(true);
              }}
            >
              + Add your first record
            </button>
          </div>
        )
      ) : (
        <ul className="record-card-list" aria-label="Your medical records">
          {records.map((rec) => (
            <li key={rec._id} className={`record-card ${activeId === rec._id ? 'active' : ''}`}>
              <button
                type="button"
                className="record-card-select"
                onClick={() => onSelect(rec)}
                aria-current={activeId === rec._id ? 'true' : undefined}
                aria-label={`View access timeline for ${rec.title}`}
              >
                <span className="record-card-title">{rec.title}</span>
                <span className="record-card-type">
                  {rec.type}
                  {rec.attachment && (
                    <span className="record-card-attachment">
                      {' '}
                      <span aria-hidden="true">📎</span> Report attached
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                className="record-card-edit"
                onClick={() => {
                  setEditing(rec);
                  setModal(true);
                }}
                aria-label={`Edit ${rec.title}`}
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}
      {modal && (
        <RecordModal record={editing} onClose={() => setModal(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}
RecordList.propTypes = {
  records: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  activeId: PropTypes.string,
  onRefresh: PropTypes.func.isRequired,
  isSearching: PropTypes.bool,
};
