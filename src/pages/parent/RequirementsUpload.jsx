import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Loader2, X, Check, CloudUpload, Info, ChevronRight } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { motion, AnimatePresence } from 'framer-motion';

const RequirementsUpload = ({ studentId }) => {
  const { user, notify } = useGlobalState();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [signedUrls, setSignedUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!studentId) return;
    queueMicrotask(() => setLoading(true));
    let cancelled = false;
    supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) notify('Could not load documents', 'error');
        const rows = data || [];
        setDocuments(rows);
        setLoading(false);
        // One batch call for the rows on screen. Legacy rows hold dead public URLs, skip them.
        const paths = rows.map(r => r.file_url).filter(p => p && !/^https?:/i.test(p));
        if (paths.length === 0) return;
        // shortcut: signed links live 10 minutes, reload the page to re-sign a long-open tab.
        const { data: signed } = await supabase.storage.from('requirements').createSignedUrls(paths, 600);
        if (cancelled || !signed) return;
        setSignedUrls(Object.fromEntries(signed.map(s => [s.path, s.signedUrl])));
      })
      .catch(() => {
        if (cancelled) return;
        notify('Could not load documents', 'error');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [studentId, refreshKey, notify]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files);
    const valid = [];
    picked.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        notify(`"${file.name}" exceeds the 10 MB limit`, 'error');
      } else {
        valid.push(file);
      }
    });
    setFiles(valid);
  };

  const handleUpload = async () => {
    if (files.length === 0 || !studentId) return;
    setUploading(true);
    let successCount = 0;
    for (const [i, file] of files.entries()) {
      const ext = (file.name.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase();
      const filePath = `documents/${studentId}/${Date.now()}-${i}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('requirements').upload(filePath, file);
      if (uploadError) {
        notify(`Upload failed: ${uploadError.message}`, 'error');
        continue;
      }
      const { error: dbError } = await supabase.from('student_documents').insert([{
        student_id: studentId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: filePath,
        document_type: 'General'
      }]);
      if (dbError) notify(`Record failed: ${dbError.message}`, 'error');
      else successCount++;
    }
    setUploading(false);
    setFiles([]);
    if (successCount > 0) {
      setRefreshKey(k => k + 1);
      notify(`${successCount} file(s) uploaded successfully`, 'success');
    }
  };

  return (
    <div className="bg-ps-surface rounded-3xl p-8 shadow-sm border border-ps-border space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-ps-accent-soft text-ps-accent rounded-xl">
            <CloudUpload size={20} />
          </div>
          <h3 className="text-lg font-display font-bold text-ps-ink-1">Document Center</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-ps-ink-2 uppercase tracking-wide bg-ps-bg px-2.5 py-1 rounded-full">
          <Info size={12} /> Max 10MB
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Drop Zone */}
        <label className="block w-full border-2 border-dashed border-ps-border rounded-2xl p-10 text-center cursor-pointer hover:border-ps-accent hover:bg-ps-bg/50 transition-all group relative overflow-hidden">
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileChange} />
          <div className="space-y-3 relative z-10">
            <div className="w-12 h-12 bg-ps-bg rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform text-ps-ink-2 group-hover:text-ps-accent">
              <Upload size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-ps-ink-1">Drag & drop or click</p>
              <p className="text-xs text-ps-ink-2">PDF, Images, or Documents (up to 10MB)</p>
            </div>
          </div>
        </label>
        
        {/* Pending Files List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between px-1 pt-2">
                <span className="text-xs font-bold uppercase tracking-wide text-ps-ink-2">Ready to upload ({files.length})</span>
                <button onClick={() => setFiles([])} className="text-xs font-bold text-ps-danger hover:underline">Clear all</button>
              </div>
              
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 bg-ps-bg rounded-2xl border border-ps-border">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-1.5 bg-ps-surface rounded-lg border border-ps-border text-ps-ink-2">
                        <FileText size={14} />
                      </div>
                      <span className="text-xs font-bold text-ps-ink-1 truncate">{file.name}</span>
                    </div>
                    <button 
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))} 
                      className="p-1.5 text-ps-ink-2 hover:text-ps-danger hover:bg-ps-danger/10 rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleUpload} 
                disabled={uploading}
                className="w-full py-4 bg-ps-accent dark:bg-indigo-600 hover:bg-ps-accent/90 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 group"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />}
                {uploading ? 'Processing Secure Upload...' : 'Submit Documents'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submitted History */}
      <div className="pt-6 border-t border-ps-border space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ps-ink-2 px-1">Submission History</h4>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map(i => <div key={i} className="h-14 w-full bg-ps-bg animate-pulse rounded-2xl" />)}
          </div>
        ) : documents.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5">
            {documents.map((doc) => {
              // Legacy rows hold a dead public URL; anything else is a storage path needing a signed URL.
              const href = /^https?:/i.test(doc.file_url || '') ? null : signedUrls[doc.file_url];
              return (
              <a 
                key={doc.id} 
                href={href || undefined} 
                target="_blank" 
                rel="noreferrer"
                aria-disabled={href ? undefined : true}
                className="flex items-center gap-4 p-3.5 rounded-2xl border border-ps-border hover:border-ps-accent hover:bg-ps-accent-soft/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-ps-bg flex items-center justify-center text-ps-success shadow-sm group-hover:bg-ps-surface transition-colors">
                  <Check size={18} strokeWidth={3} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ps-ink-1 truncate group-hover:text-ps-accent transition-colors">{doc.file_name}</p>
                  <p className="text-xs font-bold text-ps-ink-2 uppercase tracking-tight mt-0.5">
                    Uploaded • {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <ChevronRight size={16} className="text-ps-ink-2 group-hover:translate-x-1 transition-transform" />
              </a>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center bg-ps-bg/30 rounded-2xl border-2 border-dashed border-ps-border">
            <p className="text-xs font-bold text-ps-ink-2 uppercase tracking-wide">No documents found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequirementsUpload;
