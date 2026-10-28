import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, Navigate } from 'react-router-dom';
import { ArrowLeft, User, Users, Mail, Phone, Calendar, FileText, CheckCircle2, Clock, Stethoscope, BookOpen, Activity, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useGlobalState } from '../context/GlobalStateContext';

const ProfilePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { staff, students, sessions, appRole, parentChildren, fetchParentChildren, fetchStudentDocumentRows } = useGlobalState();
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
        const { data } = await fetchStudentDocumentRows(id);
        if (data) setStudentDocs(data);
        setDocsLoading(false);
      })();
    }
    // Factory actions are state-free and recreated per render by design (ADR-001).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Loader2 className="animate-spin text-[var(--sa-gold)]" aria-hidden="true" />
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
      <User size={24} strokeWidth={1.5} className="sa-t-muted mb-4" />
      <h1 className="sa-title mb-1">Profile Not Found</h1>
      <p className="sa-sub mb-6">The requested profile does not exist or has been removed.</p>
      <Link to={isAdminOnly ? '/directory' : '/dashboard'} className="sa-btn sa-btn--primary">
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

  // Department / status identity is ink, never a fill.
  const deptColors = {
    SPED: 'sa-t-warm',
    Rehab: '',
    Playschool: 'sa-t-warm',
    Admin: '',
  };

  const statusColors = {
    Active: 'sa-badge--positive',
    Enrolled: 'sa-badge--positive',
    Inactive: '',
    'On Leave': 'sa-badge--warn',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 animate-page-entry">
      <Link to={isAdminOnly ? '/directory' : '/dashboard'} className="sa-link">
        <ArrowLeft size={14} strokeWidth={1.5} /> {isAdminOnly ? 'Back to Directory' : 'Back to Dashboard'}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Profile Card ────────────────────────────── */}
        <motion.div 
          className="lg:col-span-1 border border-[var(--sa-line-default)] bg-[var(--sa-surface-1)] overflow-hidden"
        >
          {/* Flat header — department identity lives in the badge below */}
          <div className="h-20 bg-[var(--sa-surface-warm)]" />

          <div className="px-6 pb-6">
            <div className="flex flex-col items-center -mt-10 mb-4">
              <div className="w-20 h-20 bg-[var(--sa-surface-warm)] flex items-center justify-center text-3xl border border-[var(--sa-line-default)]"
                style={{ color: profile.department === 'Rehab' ? 'var(--color-rehab)' : profile.department === 'SPED' ? 'var(--color-sped)' : profile.department === 'Playschool' ? 'var(--color-playschool)' : 'var(--ps-ink-2)' }}
              >
                {profile.name.charAt(0)}
              </div>
              <h1 className="sa-title mt-3 text-center">{profile.name}</h1>
              <p className="sa-sub text-center">{profile.role}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className={clsx("sa-badge", deptColors[profile.department] || deptColors.Admin)}>
                  {profile.department}
                </span>
                <span className={clsx("sa-badge", statusColors[profile.status] || statusColors.Active)}>
                  {profile.status}
                </span>
              </div>
            </div>

            {/* Diagnosis Section — Students Only */}
            {type === 'student' && profile.diagnosis && (
              <div className="mb-4 p-4 border border-[var(--sa-line-default)]">
                <div className="flex items-center gap-2 mb-1">
                  <Stethoscope size={14} strokeWidth={1.5} className="sa-t-warm" />
                  <span className="sa-micro">Diagnosis</span>
                </div>
                <p className="sa-row-title">{profile.diagnosis}</p>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-3 border-t border-[var(--sa-line-hairline)] pt-4">
              <div className="flex items-center gap-3 text-sm text-[var(--sa-text-muted)]">
                <Mail size={14} strokeWidth={1.5} className="shrink-0 sa-t-muted" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--sa-text-muted)]">
                <Phone size={14} strokeWidth={1.5} className="shrink-0 sa-t-muted" />
                {profile.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--sa-text-muted)]">
                <Calendar size={14} strokeWidth={1.5} className="shrink-0 sa-t-muted" />
                Joined {profile.joined}
              </div>
            </div>

            {/* Assigned Therapists — Students Only */}
            {type === 'student' && assignedTherapists.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--sa-line-hairline)]">
                <h3 className="sa-micro mb-3 flex items-center gap-1.5">
                  <Activity size={12} strokeWidth={1.5} />
                  Assigned Therapists
                </h3>
                <div className="sa-list">
                  {assignedTherapists.map(t => (
                    <Link 
                      key={t.id} 
                      to={`/profile/${t.id}?type=staff`}
                      className="flex items-center gap-2.5 py-2"
                    >
                      <div className="w-8 h-8 border border-[var(--sa-line-default)] flex items-center justify-center text-[11px] tabular-nums shrink-0 sa-t-warm">
                        {t.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="sa-row-title truncate">{t.name}</p>
                        <p className="text-[11px] text-[var(--sa-text-muted)] truncate">{t.role}</p>
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
            className="sa-panel"
          >
            <div className="sa-panel-head">
              <h2 className="sa-panel-title flex items-center gap-2">
                <BookOpen size={16} strokeWidth={1.5} className="sa-t-muted" />
                {type === 'student' ? 'Assigned Program & Active Schedule' : 'Provider Daily Schedule'}
              </h2>
              <span className="sa-badge tabular-nums">
                {personalSessions.length} session{personalSessions.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="sa-list">
              {personalSessions.length > 0 ? personalSessions.map(session => (
                <motion.div 
                  key={session.id} 
                  className="sa-row"
                >
                  <div className="w-16 text-center border-r border-[var(--sa-line-hairline)] pr-3 shrink-0 tabular-nums">
                    <p className="text-sm text-[var(--sa-text-primary)]">{session.startHour}:00</p>
                    <p className="text-[11px] text-[var(--sa-text-muted)]">{session.startHour >= 12 ? 'PM' : 'AM'}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="sa-row-title truncate">{session.title}</p>
                    <p className="text-[11px] text-[var(--sa-text-muted)] flex items-center gap-1 mt-0.5">
                      {type === 'student' ? <User size={12} strokeWidth={1.5}/> : <Users size={12} strokeWidth={1.5}/>}
                      {type === 'student' 
                        ? (staff.find(st => st.id === session.therapistId)?.name || 'Unassigned')
                        : `${session.studentIds.length} Student${session.studentIds.length !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="sa-badge">
                      {session.type}
                    </span>
                    <span className="text-[11px] tabular-nums text-[var(--sa-text-muted)]">{session.room}</span>
                  </div>
                </motion.div>
              )) : (
                <div className="sa-empty">
                  <Clock size={20} strokeWidth={1.5} className="mx-auto sa-t-muted mb-2" />
                  <p className="sa-empty-sub">No sessions scheduled for this person.</p>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* ── Student Documents (visible to Admin/Teachers) ─── */}
          {type === 'student' && ['admin', 'superadmin', 'teacher', 'therapist'].includes(appRole) && (
            <motion.div
              className="sa-panel"
            >
              <div className="sa-panel-head">
                <h2 className="sa-panel-title flex items-center gap-2">
                  <Download size={16} strokeWidth={1.5} className="sa-t-muted" />
                  Submitted Requirements
                </h2>
              </div>
              {docsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[var(--sa-gold)]" /></div>
              ) : studentDocs.length > 0 ? (
                <div className="sa-list">
                  {studentDocs.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="sa-row"
                    >
                      <FileText size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 sa-t-muted" />
                      <div className="flex-1 min-w-0">
                        <p className="sa-row-title truncate">{doc.file_name}</p>
                        <p className="text-[11px] tabular-nums sa-t-muted">{new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                      <Download size={15} strokeWidth={1.5} className="shrink-0 sa-t-muted" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="sa-empty">
                  <FileText size={20} strokeWidth={1.5} className="mx-auto sa-t-muted mb-2" />
                  <p className="sa-empty-sub">No documents submitted yet.</p>
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
