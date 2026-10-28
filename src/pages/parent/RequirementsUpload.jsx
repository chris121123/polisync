import React, { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, X, Check, Info, ChevronRight } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { motion, AnimatePresence } from 'framer-motion';

const RequirementsUpload = ({ studentId }) => {
  const { user, notify, fetchStudentDocumentRows, createSignedDocumentUrls, saveStudentDocument } = useGlobalState();
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
    fetchStudentDocumentRows(studentId)
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
        const { data: signed } = await createSignedDocumentUrls(paths);
        if (cancelled || !signed) return;
        setSignedUrls(Object.fromEntries(signed.map(s => [s.path, s.signedUrl])));
      })
      .catch(() => {
        if (cancelled) return;
        notify('Could not load documents', 'error');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [studentId, refreshKey, notify, fetchStudentDocumentRows, createSignedDocumentUrls]);

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
      const { uploadError, dbError } = await saveStudentDocument({
        studentId,
        userId: user.id,
        filePath,
        file,
        fileName: file.name,
      });
      if (uploadError) {
        notify(`Upload failed: ${uploadError.message}`, 'error');
        continue;
      }
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
    <div className="sa-panel space-y-6">
      <div className="sa-panel-head">
        <h3 className="sa-panel-title">Document Center</h3>
        <div className="flex items-center gap-1.5 text-[11px] sa-t-muted shrink-0">
          <Info size={12} strokeWidth={1.5} /> Max 10MB
        </div>
      </div>

      <div className="space-y-4">
        {/* Drop Zone */}
        <label className="block w-full border border-dashed border-[var(--sa-line-default)] p-10 text-center cursor-pointer hover:border-[var(--sa-line-strong)] transition-colors">
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileChange} />
          <div className="space-y-3">
            <Upload size={24} strokeWidth={1.5} className="mx-auto sa-t-muted" />
            <div className="space-y-1">
              <p className="text-[13px] text-[var(--sa-text-primary)]">Drag & drop or click</p>
              <p className="text-[11px] sa-t-muted">PDF, Images, or Documents (up to 10MB)</p>
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
              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="sa-micro">Ready to upload ({files.length})</span>
                <button onClick={() => setFiles([])} className="sa-link">Clear all</button>
              </div>

              <div className="sa-list">
                {files.map((file, i) => (
                  <div key={i} className="sa-row">
                    <FileText size={16} strokeWidth={1.5} className="sa-t-muted shrink-0 self-center" />
                    <span className="sa-row-title flex-1 min-w-0 truncate self-center">{file.name}</span>
                    <button
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="p-1 sa-t-muted hover:text-[var(--sa-danger)] self-center"
                    >
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="sa-btn sa-btn--primary sa-btn--block disabled:opacity-40"
              >
                {uploading ? <Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> : <Upload size={16} strokeWidth={1.5} />}
                {uploading ? 'Processing Secure Upload...' : 'Submit Documents'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submitted History */}
      <div className="pt-6 border-t border-[var(--sa-line-hairline)] space-y-4">
        <h4 className="sa-micro">Submission History</h4>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map(i => <div key={i} className="h-14 w-full bg-[var(--sa-bg-base)] animate-pulse" />)}
          </div>
        ) : documents.length > 0 ? (
          <div className="sa-list">
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
                className="sa-row"
              >
                <Check size={16} strokeWidth={1.5} className="sa-t-muted shrink-0 self-center" />
                <div className="flex-1 min-w-0 self-center">
                  <p className="sa-row-title truncate">{doc.file_name}</p>
                  <p className="sa-row-meta">
                    Uploaded • {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <ChevronRight size={16} strokeWidth={1.5} className="sa-t-muted shrink-0 self-center" />
              </a>
              );
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-[11px] sa-t-muted">No documents found</p>
        )}
      </div>
    </div>
  );
};

export default RequirementsUpload;
