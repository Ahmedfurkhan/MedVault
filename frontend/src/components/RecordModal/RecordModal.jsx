import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './RecordModal.css';
import API_BASE from '../../apiBase';

export default function RecordModal({ record, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Condition');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  // Two-step delete guards against an accidental, irreversible action.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const dialogRef = useRef(null);
  const titleInputRef = useRef(null);
  const keepBtnRef = useRef(null);
  // Remember what had focus before the dialog opened so we can restore it on close.
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (record) {
      setTitle(record.title || '');
      setType(record.type || 'Condition');
      const recordDate = record.date ? new Date(record.date) : new Date();
      setDate(Number.isNaN(recordDate.getTime()) ? '' : recordDate.toISOString().slice(0, 10));
      setNotes(record.notes || '');
    } else {
      setTitle('');
      setType('Condition');
      setDate('');
      setNotes('');
    }
  }, [record]);

  // Move focus into the dialog on open and restore it to the trigger on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    titleInputRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, []);

  // When the delete confirmation appears, move focus to the safe ("Keep") button.
  useEffect(() => {
    if (confirmingDelete) keepBtnRef.current?.focus();
  }, [confirmingDelete]);

  // Trap focus inside the dialog and close on Escape.
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const url = record ? `${API_BASE}/api/records/${record._id}` : `${API_BASE}/api/records`;
    const payload = { title, type, date, notes };
    const res = await fetch(url, {
      method: record ? 'PUT' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      onSaved(record ? 'Changes saved.' : 'Record added.');
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!record) return;
    const res = await fetch(`${API_BASE}/api/records/${record._id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      onSaved('Record deleted.');
      onClose();
    }
  };

  const headingId = 'record-modal-title';

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={headingId}>{record ? 'Edit' : 'Add'} Record</h2>
        <form onSubmit={handleSave}>
          <label htmlFor="record-title">Title</label>
          <input
            id="record-title"
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <label htmlFor="record-type">Type</label>
          <select id="record-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option>Condition</option>
            <option>Lab Result</option>
            <option>Visit Note</option>
          </select>

          <label htmlFor="record-date">Date</label>
          <input
            id="record-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <label htmlFor="record-notes">Notes</label>
          <textarea
            id="record-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
          />

          {confirmingDelete ? (
            <div className="delete-confirm" role="alertdialog" aria-label="Confirm delete">
              <p className="delete-confirm-text">
                Delete “{title || 'this record'}” permanently? This cannot be undone.
              </p>
              <div className="right-actions">
                <button
                  type="button"
                  ref={keepBtnRef}
                  onClick={() => setConfirmingDelete(false)}
                  className="cancel-btn"
                >
                  Keep record
                </button>
                <button type="button" onClick={handleDelete} className="delete-btn">
                  Delete permanently
                </button>
              </div>
            </div>
          ) : (
            <div className="modal-actions">
              {record ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="delete-btn"
                >
                  Delete
                </button>
              ) : (
                <div />
              )}
              <div className="right-actions">
                <button type="button" onClick={onClose} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
RecordModal.propTypes = {
  record: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};
