// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';

export const createDocumentActions = () => {
  // Returns the query promise unchanged; the caller keeps its own .then/.catch chain.
  const fetchStudentDocumentRows = (studentId) => supabase
    .from('student_documents')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  const createSignedDocumentUrls = (paths) => supabase.storage.from('requirements').createSignedUrls(paths, 600);

  const saveStudentDocument = async ({ studentId, userId, filePath, file, fileName }) => {
    const { error: uploadError } = await supabase.storage.from('requirements').upload(filePath, file);
    // No row without the file: same short-circuit the upload loop always had.
    if (uploadError) return { uploadError, dbError: null };
    const { error: dbError } = await supabase.from('student_documents').insert([{
      student_id: studentId,
      uploaded_by: userId,
      file_name: fileName,
      file_url: filePath,
      document_type: 'General',
    }]);
    return { uploadError, dbError };
  };

  return { fetchStudentDocumentRows, createSignedDocumentUrls, saveStudentDocument };
};
