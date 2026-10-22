import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, Navigate } from 'react-router-dom';
import { ArrowLeft, User, Users, Mail, Phone, Calendar, FileText, CheckCircle2, Clock, Stethoscope, BookOpen, Activity, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useGlobalState } from '../context/GlobalStateContext';
import { supabase } from '../lib/supabase';

const ProfilePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { staff, students, sessions, appRole, parentChildren, fetchParentChildren } = useGlobalState();
  const isAdminOnly = appRole === 'admin';
  const [studentDocs, setStudentDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [linksReady, setLinksReady] = useState(false);

  useEffect(() => {
    if (appRole === 'parent') {
      fetchParentChildren().then(() => setLinksReady(true)).catch(() => setLinksReady(true));
    }
  }, [appRole, fetchParentChildren]);
  
  const type = searchParams.get('type') || 'student';

  useEffect(() => {
    if (type === 'student' && id && ['admin', 'superadmin', 'teacher', 'therapist'].includes(appRole)) {
      (async () => {
        setDocsLoading(true);
        const { data } = await supabase
          .from('student_documents')
          .select('*')
          .eq('student_id', id)
          .order('created_at', { ascending: false });
        if (data) setStudentDocs(data);
        setDocsLoading(false);
      })();
    }
  }, [id, type, appRole]);
  
  const profile = type === 'staff' 
    ? staff.find(s => String(s.id) === String(id)) 
    : students.find(s => String(s.id) === String(id));

  // D1: parents are limited to their own linked children.
  // Fail closed: render nothing but a loader until links are loaded, so an
  // unlinked profile (incl. diagnosis) is never painted transiently.
  if (appRole === 'parent' && !linksReady) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading profile">
        <Loader2 className="animate-spin text-ps-accent" aria-hidden="true" />
      </div>
    );
  }
  if (appRole === 'parent' && type === 'staff') return <Navigate to="/dashboard" replace />;
  if (appRole === 'parent' && type === 'student' && linksReady) {
    const linked = (parentChildren || []).some(c => String(c.id) === String(id));
    if (!linked) return <Navigate to="/dashboard" replace />;
  }

  if (!profile) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-16 h-16 rounded-2xl bg-ps-bg flex items-center justify-center text-ps-ink-2 mb-4">
        <User size={32} />
      </div>
      <h2 className="text-xl font-semibold text-ps-ink-1 mb-1">Profile Not Found</h2>
      <p className="text-sm text-ps-ink-2 mb-6">The requested profile does not exist or has been removed.</p>
      <Link to={isAdminOnly ? '/directory' : '/dashboard'} className="px-4 py-2 bg-ps-accent dark:bg-indigo-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-colors">
        {isAdminOnly ? 'Return to Directory' : 'Back to Dashboard'}
      </Link>
    </div>
  );

  const personalSessions = type === 'staff'
    ? sessions.filter(s => String(s.therapistId) === String(id))
    : sessions.filter(s => s.studentIds.some(sid => String(sid) === String(id)));

  // For students: find assigned therapists from their sessions
  const assignedTherapists = type === 'student'
    ? [...new Set(personalSessions.map(s => s.therapistId))]
        .map(tid => staff.find(st => String(st.id) === String(tid)))
        .filter(Boolean)
    : [];

  // Department color mapping
  const deptColors = {
    SPED: 'bg-sped/10 text-sped border-sped/20',
    Rehab: 'bg-rehab/10 text-rehab border-rehab/20',
    Playschool: 'bg-ps-warn/10 text-ps-warn border-ps-warn/20',
    Admin: 'bg-ps-bg text-ps-ink-1 border-ps-border',
  };

  const statusColors = {
    Active: 'bg-ps-success/10 text-ps-success border-ps-success/20',
    Enrolled: 'bg-ps-success/10 text-ps-success border-ps-success/20',
    Inactive: 'bg-ps-bg text-ps-ink-2 border-ps-border',
    'On Leave': 'bg-ps-warn/10 text-ps-warn border-ps-warn/20',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 animate-page-entry">
      <Link to={isAdminOnly ? '/directory' : '/dashboard'} className="inline-flex items-center gap-2 text-sm font-medium text-ps-ink-2 hover:text-ps-accent transition-colors">
        <ArrowLeft size={16} /> {isAdminOnly ? 'Back to Directory' : 'Back to Dashboard'}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Profile Card ────────────────────────────── */}
        <motion.div 
          className="lg:col-span-1 border border-ps-border bg-ps-surface rounded-2xl shadow-sm overflow-hidden"
        >
          {/* Flat header — department identity lives in the badge below */}
          <div className="h-20 bg-ps-accent-soft" />

          <div className="px-6 pb-6">
            <div className="flex flex-col items-center -mt-10 mb-4">
              <div className="w-20 h-20 rounded-full bg-ps-surface flex items-center justify-center text-3xl font-medium border-4 border-white dark:border-ps-border shadow-sm"
                style={{ color: profile.department === 'Rehab' ? 'var(--color-rehab)' : profile.department === 'SPED' ? 'var(--color-sped)' : profile.department === 'Playschool' ? 'var(--color-playschool)' : 'var(--ps-ink-2)' }}
              >
                {profile.name.charAt(0)}
              </div>
              <h1 className="text-xl font-semibold text-ps-ink-1 mt-3 text-center">{profile.name}</h1>
              <p className="text-sm font-medium text-ps-ink-2">{profile.role}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", deptColors[profile.department] || deptColors.Admin)}>
                  {profile.department}
                </span>
                <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", statusColors[profile.status] || statusColors.Active)}>
                  {profile.status}
                </span>
              </div>
            </div>

            {/* Diagnosis Section — Students Only */}
            {type === 'student' && profile.diagnosis && (
              <div className="mb-4 p-4 rounded-xl bg-ps-accent-soft border border-ps-accent/20">
                <div className="flex items-center gap-2 mb-1">
                  <Stethoscope size={14} className="text-ps-accent" />
                  <span className="text-xs font-medium text-ps-accent ">Diagnosis</span>
                </div>
                <p className="text-sm font-medium text-ps-accent">{profile.diagnosis}</p>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-3 border-t border-ps-border pt-4">
              <div className="flex items-center gap-3 text-sm text-ps-ink-2 font-medium">
                <div className="p-1.5 rounded-lg bg-ps-bg text-ps-ink-2"><Mail size={14} /></div>
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-ps-ink-2 font-medium">
                <div className="p-1.5 rounded-lg bg-ps-bg text-ps-ink-2"><Phone size={14} /></div>
                {profile.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-ps-ink-2 font-medium">
                <div className="p-1.5 rounded-lg bg-ps-bg text-ps-ink-2"><Calendar size={14} /></div>
                Joined {profile.joined}
              </div>
            </div>

            {/* Assigned Therapists — Students Only */}
            {type === 'student' && assignedTherapists.length > 0 && (
              <div className="mt-4 pt-4 border-t border-ps-border">
                <h3 className="text-xs font-semibold text-ps-ink-2 mb-3 flex items-center gap-1.5">
                  <Activity size={12} />
                  Assigned Therapists
                </h3>
                <div className="space-y-2">
                  {assignedTherapists.map(t => (
                    <Link 
                      key={t.id} 
                      to={`/profile/${t.id}?type=staff`}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-ps-bg transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-ps-accent-soft text-ps-accent flex items-center justify-center text-xs font-medium shrink-0">
                        {t.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ps-ink-1 group-hover:text-ps-accent transition-colors truncate">{t.name}</p>
                        <p className="text-xs text-ps-ink-2 font-medium truncate">{t.role}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Right Column: Schedule & Notes ───────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            className="bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-ps-ink-1 flex items-center gap-2">
                <BookOpen size={18} className="text-ps-accent" />
                {type === 'student' ? 'Assigned Program & Active Schedule' : 'Provider Daily Schedule'}
              </h2>
              <span className="text-xs font-medium text-ps-ink-2 bg-ps-bg px-2.5 py-1 rounded-lg border border-ps-border">
                {personalSessions.length} session{personalSessions.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {personalSessions.length > 0 ? personalSessions.map(session => (
                <motion.div 
                  key={session.id} 
                  className="p-4 rounded-xl border border-ps-border flex items-center gap-4 hover:border-ps-accent/20 hover:shadow-sm transition-all group"
                >
                  <div className="w-16 text-center border-r border-ps-border pr-4 shrink-0">
                    <p className="font-medium text-sm text-ps-ink-1">{session.startHour}:00</p>
                    <p className="font-medium text-xs text-ps-ink-2">{session.startHour >= 12 ? 'PM' : 'AM'}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ps-ink-1 text-sm group-hover:text-ps-accent transition-colors">{session.title}</p>
                    <p className="text-xs text-ps-ink-2 font-medium flex items-center gap-1 mt-0.5">
                      {type === 'student' ? <User size={12}/> : <Users size={12}/>}
                      {type === 'student' 
                        ? (staff.find(st => st.id === session.therapistId)?.name || 'Unassigned')
                        : `${session.studentIds.length} Student${session.studentIds.length !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={clsx(
                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                      session.type === 'sped' ? 'bg-sped/10 text-sped border-sped/20' :
                      session.type === 'rehab' ? 'bg-rehab/10 text-rehab border-rehab/20' :
                      'bg-ps-warn/10 text-ps-warn border-ps-warn/20'
                    )}>
                      {session.type}
                    </span>
                    <span className="text-xs font-medium text-ps-ink-2 bg-ps-bg px-2 py-1 rounded">{session.room}</span>
                  </div>
                </motion.div>
              )) : (
                <div className="p-12 text-center text-ps-ink-2 border border-dashed border-ps-border rounded-xl">
                  <Clock size={28} className="mx-auto text-ps-ink-1 mb-2" />
                  <p className="text-sm font-medium">No sessions scheduled for this person.</p>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* ── Student Documents (visible to Admin/Teachers) ─── */}
          {type === 'student' && ['admin', 'superadmin', 'teacher', 'therapist'].includes(appRole) && (
            <motion.div
              className="bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border"
            >
              <h2 className="text-lg font-semibold text-ps-ink-1 mb-4 flex items-center gap-2">
                <Download size={18} className="text-ps-accent" />
                Submitted Requirements
              </h2>
              {docsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin text-ps-accent" /></div>
              ) : studentDocs.length > 0 ? (
                <div className="space-y-2">
                  {studentDocs.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-ps-border hover:border-ps-accent/20 dark:hover:border-ps-accent/20 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-ps-accent-soft dark:bg-ps-accent-soft flex items-center justify-center text-ps-accent shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ps-ink-1 truncate group-hover:text-ps-accent transition-colors">{doc.file_name}</p>
                        <p className="text-xs text-ps-ink-2">{new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                      <Download size={15} className="text-ps-ink-2 group-hover:text-ps-accent transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-ps-border rounded-xl">
                  <FileText size={28} className="mx-auto text-ps-ink-2 mb-2" />
                  <p className="text-sm font-medium text-ps-ink-2">No documents submitted yet.</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
