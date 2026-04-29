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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Session Notes</h2>
        <p className="text-slate-500 font-medium mt-1">Review and manage your therapy session notes</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div className="flex gap-1.5">
            {['all', 'progress', 'general', 'attendance', 'incident'].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  filter === type
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {filteredNotes.length > 0 ? filteredNotes.map(note => (
            <div key={note.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{note.students?.name || 'Student'}</span>
                    <span className="text-xs px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full capitalize">
                      {note.note_type}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed ${expandedNote === note.id ? '' : 'line-clamp-2'}`}>
                    {note.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(r => (
                        <Star key={r} size={12} className={note.rating >= r ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'} fill={note.rating >= r ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                    {note.content && note.content.length > 120 && (
                      <button
                        onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                        className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
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
              <FileText size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No session notes found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionNotes;