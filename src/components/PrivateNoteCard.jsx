import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Edit, Trash2 } from 'lucide-react';
import StrandsModal from './ui/strands-modal';

const emptyNoteState = {
  loading: false,
  saving: false,
  deleting: false,
  editing: false,
  noteId: null,
  text: '',
  originalText: '',
  createdAt: null,
  updatedAt: null,
  error: ''
};

const PrivateNoteCard = ({
  bookingId,
  title = 'Private Note',
  description = 'Only visible to you',
  className = '',
  onNoteChange
}) => {
  const [noteState, setNoteState] = useState(emptyNoteState);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const datePart = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
    const timePart = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
    return `${datePart} ${timePart}`;
  }, []);

  const openModal = useCallback((config = {}) => {
    setModalConfig({
      title: 'Notice',
      message: '',
      type: 'info',
      confirmText: 'OK',
      onConfirm: () => setShowModal(false),
      showCancel: false,
      cancelText: 'Cancel',
      ...config
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const fetchNote = useCallback(async () => {
    if (!bookingId) {
      setNoteState({ ...emptyNoteState });
      return;
    }

    setNoteState((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Missing authentication token');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/appointment-notes/booking/${bookingId}/my-note`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load note');
      }

      const result = await response.json();
      const noteEntry = Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null;

      if (noteEntry) {
        setNoteState({
          loading: false,
          saving: false,
          deleting: false,
          editing: false,
          noteId: noteEntry.note_id,
          text: noteEntry.note || '',
          originalText: noteEntry.note || '',
          createdAt: noteEntry.created_at || null,
          updatedAt: noteEntry.updated_at || null,
          error: ''
        });
      } else {
        setNoteState({
          ...emptyNoteState,
          editing: true
        });
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to load note';
      setNoteState({
        ...emptyNoteState,
        error: errorMessage
      });
    }
  }, [bookingId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const handleNoteChange = (value) => {
    if (value.length > 2000) return;
    setNoteState((prev) => ({
      ...prev,
      text: value,
      error: ''
    }));
  };

  const handleCancelEdit = () => {
    setNoteState((prev) => ({
      ...prev,
      editing: false,
      text: prev.noteId ? prev.originalText : '',
      error: ''
    }));
  };

  const handleSave = async () => {
    if (!bookingId) return;

    const trimmed = noteState.text.trim();
    if (!trimmed) {
      setNoteState((prev) => ({ ...prev, error: 'Note cannot be empty.' }));
      return;
    }

    setNoteState((prev) => ({ ...prev, saving: true, error: '' }));

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Missing authentication token');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const isUpdate = Boolean(noteState.noteId);
      const url = isUpdate
        ? `${apiUrl}/appointment-notes/update/${noteState.noteId}`
        : `${apiUrl}/appointment-notes/create`;
      const method = isUpdate ? 'PATCH' : 'POST';
      const body = isUpdate
        ? JSON.stringify({ note: trimmed })
        : JSON.stringify({ booking_id: bookingId, note: trimmed });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save note');
      }

      const payload = data.data;
      setNoteState({
        loading: false,
        saving: false,
        deleting: false,
        editing: false,
        noteId: payload.note_id,
        text: payload.note || '',
        originalText: payload.note || '',
        createdAt: payload.created_at || null,
        updatedAt: payload.updated_at || null,
        error: ''
      });

      openModal({
        title: 'Success',
        message: isUpdate ? 'Private note updated.' : 'Private note saved.',
        type: 'success'
      });

      if (typeof onNoteChange === 'function') {
        onNoteChange(payload);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to save note';
      setNoteState((prev) => ({
        ...prev,
        saving: false,
        error: errorMessage
      }));
      openModal({
        title: 'Save Failed',
        message: errorMessage,
        type: 'error'
      });
    }
  };

  const confirmDelete = () => {
    if (!noteState.noteId) return;

    openModal({
      title: 'Delete Note',
      message: 'Delete this note? This cannot be undone.',
      type: 'warning',
      showCancel: true,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        setShowModal(false);
        handleDelete();
      }
    });
  };

  const handleDelete = async () => {
    if (!noteState.noteId) return;

    setNoteState((prev) => ({ ...prev, deleting: true, error: '' }));

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Missing authentication token');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/appointment-notes/delete/${noteState.noteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete note');
      }

      setNoteState({ ...emptyNoteState, editing: true });
      openModal({
        title: 'Note Deleted',
        message: 'Your private note has been removed.',
        type: 'success'
      });

      if (typeof onNoteChange === 'function') {
        onNoteChange(null);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete note';
      setNoteState((prev) => ({
        ...prev,
        deleting: false,
        error: errorMessage
      }));
      openModal({
        title: 'Delete Failed',
        message: errorMessage,
        type: 'error'
      });
    }
  };

  if (!bookingId) return null;

  return (
    <div className={`border rounded-lg p-4 bg-slate-50 ${className}`}>
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {noteState.loading ? (
        <p className="text-sm text-muted-foreground">Loading note...</p>
      ) : noteState.editing ? (
        <div className="space-y-3">
          <Textarea
            value={noteState.text}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Add a reminder about this visit..."
            className="bg-white"
            rows={4}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{noteState.text.length}/2000 characters</span>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={noteState.saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={noteState.saving || noteState.text.trim().length === 0}
              >
                {noteState.saving
                  ? 'Saving...'
                  : noteState.noteId
                    ? 'Update Note'
                    : 'Save Note'}
              </Button>
            </div>
          </div>
        </div>
      ) : noteState.noteId ? (
        <>
          <p className="text-sm text-foreground whitespace-pre-line">{noteState.text}</p>
          {noteState.updatedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              Updated {formatTimestamp(noteState.updatedAt)}
            </p>
          )}
          <div className="flex justify-end gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNoteState((prev) => ({ ...prev, editing: true }))}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={confirmDelete}
              disabled={noteState.deleting}
            >
              {noteState.deleting ? 'Deleting...' : (
                <>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Capture feedback or reminders for yourself. Customers cannot see private notes.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNoteState((prev) => ({ ...prev, editing: true }))}
          >
            Add Note
          </Button>
        </div>
      )}

      {noteState.error && (
        <p className="text-xs text-red-600 mt-3">{noteState.error}</p>
      )}

      <StrandsModal
        isOpen={showModal}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showCancel={modalConfig.showCancel}
        cancelText={modalConfig.cancelText}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm || closeModal}
      />
    </div>
  );
};

export default PrivateNoteCard;

