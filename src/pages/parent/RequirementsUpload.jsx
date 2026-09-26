import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Loader2, X, Check } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';

const RequirementsUpload = ({ studentId }) => {
  const { user } = useGlobalState();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setDocuments(data || []);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [studentId, refreshKey]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !studentId) return;

    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}_${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('requirements')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError.message);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('requirements')
        .getPublicUrl(filePath);

      // Insert record to student_documents
      const { error: dbError } = await supabase
        .from('student_documents')
        .insert([{
          student_id: studentId,
          uploaded_by: user.id,
          file_name: file.name,
          file_url: publicUrl,
          document_type: 'General'
        }]);

      if (!dbError) successCount++;
    }

    setUploading(false);
    setFiles([]);
    if (successCount > 0) setRefreshKey(k => k + 1);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
        <Upload size={16} className="text-indigo-500" />
        School Requirements
      </h3>
      
      <div className="mb-6">
        <label className="block w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors">
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
          <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Click to browse or drag and drop files here
          </span>
        </label>
        
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={16} className="text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                </div>
                <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>
            ))}
            
            <button 
              onClick={handleUpload} 
              disabled={uploading}
              className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Submitted Documents</h4>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-500" /></div>
        ) : documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <a 
                key={doc.id} 
                href={doc.file_url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Check size={14} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{doc.file_name}</p>
                  <p className="text-xs text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl">No documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
};

export default RequirementsUpload;
