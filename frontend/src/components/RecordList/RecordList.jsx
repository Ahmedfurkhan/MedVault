import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import RecordModal from '../RecordModal/RecordModal';
import API_BASE from '../../apiBase';
import './RecordList.css';

export default function RecordList({ records, onSelect, activeId, onRefresh, isSearching }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState('');
  // Which record is showing its inline delete confirmation.
  const [confirmingId, setConfirmingId] = useState(null);

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

  const deleteRecord = async (rec) => {
    const res = await fetch(`${API_BASE}/api/records/${rec._id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setConfirmingId(null);
    if (res.ok) handleSaved('Record deleted.');
    else setStatus('Could not delete the record. Please try again.');
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
              {confirmingId === rec._id ? (
                <div
                  className="record-card-confirm"
                  role="group"
                  aria-label={`Delete ${rec.title}?`}
                >
                  <span className="record-card-confirm-text">Delete this record?</span>
                  <div className="record-card-actions">
                    <button
                      type="button"
                      className="record-card-edit"
                      onClick={() => setConfirmingId(null)}
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      className="record-card-delete"
                      onClick={() => deleteRecord(rec)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="record-card-actions">
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
                  <button
                    type="button"
                    className="record-card-delete"
                    onClick={() => setConfirmingId(rec._id)}
                    aria-label={`Delete ${rec.title}`}
                  >
                    Delete
                  </button>
                </div>
              )}
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
