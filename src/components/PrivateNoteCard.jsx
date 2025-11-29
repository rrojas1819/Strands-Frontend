import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  initialNote = null, // Pre-fetched note data to avoid individual fetch
  title = 'Private note',
  description = 'Only you can see this.',
  className = '',
  onNoteChange
}) => {
  const [noteState, setNoteState] = useState(emptyNoteState);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const abortControllerRef = useRef(null);
  const hasAttemptedFetchRef = useRef(false);
  const hasFetchedOnMountRef = useRef(false);

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

  const fetchNote = useCallback(async (abortSignal) => {
    if (!bookingId) {
      setNoteState({ ...emptyNoteState });
      return;
    }

    hasAttemptedFetchRef.current = true;
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
        },
        signal: abortSignal
      });

      // Handle 404 as "no note exists" (not an error)
      if (response.status === 404) {
        setNoteState((prev) => ({
          ...emptyNoteState,
          editing: prev.editing || false, // Keep editing if user clicked to add
          loading: false,
          error: ''
        }));
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load note');
      }

      const result = await response.json();
      const noteEntry = Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null;

      if (noteEntry) {
        setNoteState((prev) => ({
          loading: false,
          saving: false,
          deleting: false,
          editing: prev.editing, // Keep editing state if user clicked to edit
          noteId: noteEntry.note_id,
          text: noteEntry.note || '',
          originalText: noteEntry.note || '',
          createdAt: noteEntry.created_at || null,
          updatedAt: noteEntry.updated_at || null,
          error: ''
        }));
      } else {
        // No note exists (empty array)
        setNoteState((prev) => ({
          ...emptyNoteState,
          editing: prev.editing || false, // Keep editing if user clicked to add
          loading: false,
          error: ''
        }));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Silently ignore aborted requests
      }
      const errorMessage = err.message || 'Failed to load note';
      setNoteState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [bookingId]);

  // Use initialNote if provided, otherwise fetch on mount
  useEffect(() => {
    if (bookingId && !hasFetchedOnMountRef.current) {
      hasFetchedOnMountRef.current = true;
      
      // If initialNote is provided, use it directly (no fetch needed)
      if (initialNote !== null && initialNote !== undefined) {
        if (initialNote) {
          setNoteState({
            loading: false,
            saving: false,
            deleting: false,
            editing: false,
            noteId: initialNote.note_id,
            text: initialNote.note || '',
            originalText: initialNote.note || '',
            createdAt: initialNote.created_at || null,
            updatedAt: initialNote.updated_at || null,
            error: ''
          });
        } else {
          // initialNote is explicitly null (no note exists)
          setNoteState({ ...emptyNoteState, loading: false });
        }
        return;
      }
      
      // Otherwise, fetch the note
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      setNoteState((prev) => ({ 
        ...prev, 
        loading: true, 
        editing: false,
        error: '' 
      }));
      
      fetchNote(controller.signal).finally(() => {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      });
    }
    
    // Reset fetch flag when bookingId changes (cleanup)
    return () => {
      hasFetchedOnMountRef.current = false;
    };
  }, [bookingId, initialNote, fetchNote]);

  // Add/Edit note - set editing mode
  const handleAddNoteClick = useCallback(() => {
    // Cancel any existing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Set editing to true immediately so user can type
    setNoteState((prev) => ({ ...prev, editing: true, loading: false }));
  }, []);

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
      setNoteState((prev) => ({
        loading: false,
        saving: false,
        deleting: false,
        editing: false, // Close editor after save
        noteId: payload.note_id,
        text: payload.note || '',
        originalText: payload.note || '',
        createdAt: payload.created_at || null,
        updatedAt: payload.updated_at || null,
        error: ''
      }));

      openModal({
        title: 'Success',
        message: isUpdate ? 'Private note updated.' : 'Private note saved.',
        type: 'success',
        confirmButtonId: `private-note-success-ok-button-${bookingId}`
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
      confirmButtonId: `private-note-delete-confirm-button-${bookingId}`,
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

      setNoteState({ ...emptyNoteState, editing: false });
      openModal({
        title: 'Note Deleted',
        message: 'Your private note has been removed.',
        type: 'success',
        confirmButtonId: `private-note-delete-success-ok-button-${bookingId}`
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
    <div className={`rounded-xl border border-gray-200 bg-gray-50 p-4 ${className}`}>
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {noteState.loading && !noteState.editing ? (
        <p className="text-sm text-muted-foreground">Loading note...</p>
      ) : noteState.editing ? (
        <div className="space-y-3">
          <Textarea
            id={`private-note-textarea-${bookingId}`}
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
                id={`private-note-save-button-${bookingId}`}
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
        // Note exists - show it with edit/delete buttons
        <>
          <p className="text-sm text-foreground whitespace-pre-line">{noteState.text}</p>
          {noteState.updatedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              Updated {formatTimestamp(noteState.updatedAt)}
            </p>
          )}
          <div className="flex justify-end gap-2 mt-3">
            <Button
              id={`private-note-edit-button-${bookingId}`}
              variant="ghost"
              size="sm"
              onClick={handleAddNoteClick}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              id={`private-note-delete-button-${bookingId}`}
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
        // No note exists after fetch - show add button only
        <div className="space-y-3">
          <Button
            id={`private-note-add-button-${bookingId}`}
            variant="outline"
            size="sm"
            onClick={handleAddNoteClick}
          >
            Add private note
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
        confirmButtonId={modalConfig.confirmButtonId}
      />
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(PrivateNoteCard);

