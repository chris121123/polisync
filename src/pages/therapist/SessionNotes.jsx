import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Star, Search, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';

const SessionNotes = () => {
  const { user, fetchSessionNotes } = useGlobalState();
  const [notes, setNotes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNote, setExpandedNote] = useState(null);

  const fetchNotes = React.useCallback(async () => {
    const data = await fetchSessionNotes();
    if (data) setNotes(data);
    // Factory actions are state-free and recreated per render by design (ADR-001).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const myNotes = notes.filter(n => String(n.created_by) === String(user?.id));

  const filteredNotes = myNotes.filter(n => {
    if (filter !== 'all' && n.note_type !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.content?.toLowerCase().includes(query) ||
        n.students?.name?.toLowerCase().includes(query) ||
        n.sessions?.title?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      <div className="pb-4 sa-rule-b">
        <h1 className="sa-title">Session Notes</h1>
        <p className="sa-sub">Review and manage your therapy session notes</p>
      </div>

      <div className="bg-[var(--sa-surface-1)] border border-[var(--sa-line-default)] overflow-hidden">
        <div className="p-4 border-b border-[var(--sa-line-hairline)] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sa-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-3 py-2 bg-[var(--sa-bg-base)] border border-[var(--sa-line-default)] text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)]"
            />
          </div>
          <div className="flex flex-wrap gap-px shrink-0 sm:flex-nowrap sm:gap-0 sm:divide-x sm:divide-[var(--sa-line-default)] sm:border sm:border-[var(--sa-line-default)]">
            {['all', 'progress', 'general', 'attendance', 'incident'].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`border border-[var(--sa-line-default)] sm:border-0 px-3 py-1.5 text-xs capitalize shrink-0 ${
                  filter === type
                    ? 'text-[var(--sa-text-primary)] outline-1 outline-[var(--sa-gold)] -outline-offset-1'
                    : 'text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="sa-list">
          {filteredNotes.length > 0 ? filteredNotes.map(note => (
            <div key={note.id} className="sa-row p-5 hover:bg-[var(--sa-surface-2)]">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="sa-row-title">{note.students?.name || 'Student'}</span>
                    <span className="sa-badge">
                      {note.note_type}
                    </span>
                    <span className="text-[11px] text-[var(--sa-text-muted)] flex items-center gap-1 tabular-nums">
                      <Calendar size={12} strokeWidth={1.5} />
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm text-[var(--sa-text-muted)] leading-relaxed ${expandedNote === note.id ? '' : 'line-clamp-2'}`}>
                    {note.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(r => (
                        <Star key={r} size={12} strokeWidth={1.5} className={note.rating >= r ? 'sa-t-warm' : 'sa-t-muted'} fill={note.rating >= r ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                    {note.content && note.content.length > 120 && (
                      <button
                        onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                        className="sa-link flex items-center gap-1"
                      >
                        {expandedNote === note.id ? 'Show less' : 'Show more'}
                        {expandedNote === note.id ? <ChevronUp size={12} strokeWidth={1.5} /> : <ChevronDown size={12} strokeWidth={1.5} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="sa-empty">
              <FileText size={20} strokeWidth={1.5} className="sa-t-muted mx-auto mb-3" />
              <p className="sa-empty-sub">No session notes found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionNotes;
