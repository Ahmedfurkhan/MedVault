import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RecordModal.css';
import API_BASE from '../../apiBase';

export default function RecordModal({ record, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Condition');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

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
      onSaved();
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
      onSaved();
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>{record ? 'Edit' : 'Add'} Record</h3>
        <form onSubmit={handleSave}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Condition</option>
            <option>Lab Result</option>
            <option>Visit Note</option>
          </select>

          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" />

          <div className="modal-actions">
            {record ? (
              <button type="button" onClick={handleDelete} className="delete-btn">
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
