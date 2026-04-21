import React from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Users, Mail, Phone, Calendar, FileText, CheckCircle2, Clock, Stethoscope, BookOpen, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useGlobalState } from '../context/GlobalStateContext';

const ProfilePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { staff, students, sessions } = useGlobalState();
  
  const type = searchParams.get('type') || 'student';
  
  const profile = type === 'staff' 
    ? staff.find(s => String(s.id) === String(id)) 
    : students.find(s => String(s.id) === String(id));

  if (!profile) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
        <User size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Profile Not Found</h2>
      <p className="text-sm text-slate-500 mb-6">The requested profile does not exist or has been removed.</p>
      <Link to="/directory" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
        Return to Directory
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
    SPED: 'bg-purple-100 text-purple-700 border-purple-200',
    Rehab: 'bg-sky-100 text-sky-700 border-sky-200',
    Playschool: 'bg-amber-100 text-amber-700 dark:text-amber-300 border-amber-200',
    Admin: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  };

  const statusColors = {
    Active: 'bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-200',
    Enrolled: 'bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-200',
    Inactive: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700',
    'On Leave': 'bg-amber-100 text-amber-700 dark:text-amber-300 border-amber-200',
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <Link to="/directory" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 dark:text-indigo-400 transition-colors mb-6">
        <ArrowLeft size={16} /> Back to Directory
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Profile Card ────────────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden"
        >
          {/* Gradient header */}
          <div className={clsx(
            'h-20 bg-gradient-to-br',
            profile.department === 'Rehab' ? 'from-sky-400 to-blue-500' :
            profile.department === 'SPED' ? 'from-purple-400 to-violet-500' :
            profile.department === 'Playschool' ? 'from-amber-400 to-orange-500' :
            'from-slate-400 to-slate-500'
          )} />

          <div className="px-6 pb-6">
            <div className="flex flex-col items-center -mt-10 mb-4">
              <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-900 flex items-center justify-center text-3xl font-bold border-4 border-white dark:border-slate-800 shadow-lg"
                style={{ color: profile.department === 'Rehab' ? '#0284c7' : profile.department === 'SPED' ? '#7c3aed' : profile.department === 'Playschool' ? '#d97706' : '#475569' }}
              >
                {profile.name.charAt(0)}
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-3 text-center">{profile.name}</h1>
              <p className="text-sm font-medium text-slate-500">{profile.role}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border", deptColors[profile.department] || deptColors.Admin)}>
                  {profile.department}
                </span>
                <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border", statusColors[profile.status] || statusColors.Active)}>
                  {profile.status}
                </span>
              </div>
            </div>

            {/* Diagnosis Section — Students Only */}
            {type === 'student' && profile.diagnosis && (
              <div className="mb-4 p-4 rounded-xl bg-violet-50 border border-violet-100">
                <div className="flex items-center gap-2 mb-1">
                  <Stethoscope size={14} className="text-violet-500" />
                  <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Diagnosis</span>
                </div>
                <p className="text-sm font-bold text-violet-900">{profile.diagnosis}</p>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-400"><Mail size={14} /></div>
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-400"><Phone size={14} /></div>
                {profile.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-400"><Calendar size={14} /></div>
                Joined {profile.joined}
              </div>
            </div>

            {/* Assigned Therapists — Students Only */}
            {type === 'student' && assignedTherapists.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Activity size={12} />
                  Assigned Therapists
                </h3>
                <div className="space-y-2">
                  {assignedTherapists.map(t => (
                    <Link 
                      key={t.id} 
                      to={`/profile/${t.id}?type=staff`}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {t.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:text-indigo-400 transition-colors truncate">{t.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{t.role}</p>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-500" />
                {type === 'student' ? 'Assigned Program & Active Schedule' : 'Provider Daily Schedule'}
              </h2>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                {personalSessions.length} session{personalSessions.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {personalSessions.length > 0 ? personalSessions.map(session => (
                <motion.div 
                  key={session.id} 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:border-indigo-200 dark:border-indigo-700 hover:shadow-sm transition-all group"
                >
                  <div className="w-16 text-center border-r border-slate-200 dark:border-slate-700 pr-4 shrink-0">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{session.startHour}:00</p>
                    <p className="font-bold text-xs text-slate-400">{session.startHour >= 12 ? 'PM' : 'AM'}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:text-indigo-400 transition-colors">{session.title}</p>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                      {type === 'student' ? <User size={12}/> : <Users size={12}/>}
                      {type === 'student' 
                        ? (staff.find(st => st.id === session.therapistId)?.name || 'Unassigned')
                        : `${session.studentIds.length} Student${session.studentIds.length !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      session.type === 'sped' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                      session.type === 'rehab' ? 'bg-sky-50 text-sky-600 border-sky-200' :
                      'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200'
                    )}>
                      {session.type}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{session.room}</span>
                  </div>
                </motion.div>
              )) : (
                <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <Clock size={28} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-sm font-medium">No sessions scheduled for this person.</p>
                </div>
              )}
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
          >
             <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
               <FileText size={18} className="text-indigo-500" />
               Case Notes
             </h2>
             <textarea className="w-full min-h-[120px] rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm font-medium resize-none focus:ring-2 focus:ring-indigo-500 outline-none border" placeholder="Enter session notes, observations, or progress updates..."></textarea>
             <div className="mt-3 flex justify-end">
               <button className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors">Save Note</button>
             </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
