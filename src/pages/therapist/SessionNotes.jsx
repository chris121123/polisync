import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Star, Search, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { supabase } from '../../lib/supabase';

const SessionNotes = () => {
  const { user } = useGlobalState();
  const [notes, setNotes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNote, setExpandedNote] = useState(null);

  const fetchNotes = React.useCallback(async () => {
    const { data } = await supabase
      .from('session_notes')
      .select('*, sessions(*), students(*)')
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
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
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ps-ink-1">Session Notes</h2>
        <p className="text-ps-ink-2 font-medium mt-1">Review and manage your therapy session notes</p>
      </div>

      <div className="bg-ps-surface rounded-2xl shadow-sm border border-ps-border overflow-hidden">
        <div className="p-4 border-b border-ps-border flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ps-ink-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 bg-ps-bg border border-ps-border rounded-xl text-sm text-ps-ink-1 placeholder:text-ps-ink-2 focus:outline-none focus:ring-2 focus:ring-ps-accent/20 focus:border-ps-accent"
            />
          </div>
          <div className="flex gap-1.5">
            {['all', 'progress', 'general', 'attendance', 'incident'].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  filter === type
                    ? 'bg-ps-accent dark:bg-indigo-600 text-white'
                    : 'bg-ps-bg text-ps-ink-2 hover:bg-ps-border'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-ps-border">
          {filteredNotes.length > 0 ? filteredNotes.map(note => (
            <div key={note.id} className="p-5 hover:bg-ps-bg dark:hover:bg-ps-bg/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-ps-ink-1">{note.students?.name || 'Student'}</span>
                    <span className="text-xs px-2 py-0.5 bg-ps-accent-soft dark:bg-ps-accent/10 text-ps-accent rounded-full capitalize">
                      {note.note_type}
                    </span>
                    <span className="text-xs text-ps-ink-2 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm text-ps-ink-2 leading-relaxed ${expandedNote === note.id ? '' : 'line-clamp-2'}`}>
                    {note.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(r => (
                        <Star key={r} size={12} className={note.rating >= r ? 'text-ps-warn' : 'text-ps-ink-2'} fill={note.rating >= r ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                    {note.content && note.content.length > 120 && (
                      <button
                        onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                        className="text-xs font-bold text-ps-accent hover:underline flex items-center gap-1"
                      >
                        {expandedNote === note.id ? 'Show less' : 'Show more'}
                        {expandedNote === note.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center">
              <FileText size={32} className="text-ps-ink-2 mx-auto mb-3" />
              <p className="text-ps-ink-2 font-medium">No session notes found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionNotes;
