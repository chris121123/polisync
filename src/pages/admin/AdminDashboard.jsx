import React, { useState, useEffect } from 'react';
import { Users, UserCircle, DoorOpen, TrendingUp, AlertCircle, Clock, UserPlus, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGlobalState } from '../../context/GlobalStateContext';
import { supabase } from '../../lib/supabase';
import { auditLine } from '../../lib/auditLog';

export const StatCard = ({ title, value, icon: Icon, trend, subtext, color = "indigo" }) => {
  const colorMap = {
    indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800",
    emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800",
    amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800",
    rose: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/60 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
            trend > 0 ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:text-rose-300'
          }`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
        <span className="text-xs text-slate-500">{subtext}</span>
      </div>
    </motion.div>
  );
};

const rolePillColors = {
  superadmin: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  therapist: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  parent: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  teacher: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

const AdminDashboard = () => {
  const { staff, students, rooms, sessions, conflicts, appRole } = useGlobalState();
  const navigate = useNavigate();
  const [activity, setActivity] = useState([]);

  // ponytail: audit_logs select needs 20261014000001_superadmin_audit_read.sql (superadmin read) applied
  useEffect(() => {
    if (appRole !== 'superadmin' || !supabase) return;
    const fetchActivity = async () => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);
      if (error) console.error('Recent activity fetch failed:', error);
      if (data) setActivity(data);
    };
    fetchActivity();
  }, [appRole]);
  
  // Calculate rooms in use by counting unique rooms in sessions
  const roomsInUseCount = new Set(sessions.map(s => s.room)).size;
  const activeStaff = staff.filter(s => s.is_active !== false).length;
  const enrolledStudents = students.length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
          {appRole === 'superadmin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}
        </h1>
        <p className="text-sm md:text-base text-slate-500 font-medium">Here's what's happening at the center today.</p>
      </div>

      {/* Superadmin Quick Actions */}
      {appRole === 'superadmin' && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/admin/users', { state: { openCreate: true } })}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
          >
            <UserPlus size={16} />
            Create User
          </button>
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ShieldAlert size={16} />
            User Management
          </button>
        </div>
      )}

      {/* Accounts by role (superadmin only) */}
      {appRole === 'superadmin' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Accounts by role</p>
          <div className="flex flex-wrap gap-2">
            {['superadmin', 'admin', 'teacher', 'therapist', 'parent'].map(role => (
              <span key={role} className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${rolePillColors[role]}`}>
                {role} ({staff.filter(s => s.app_role === role).length})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Students" 
          value={students.length} 
          icon={Users}
          subtext={`${enrolledStudents} currently enrolled`}
          color="indigo" 
        />
        <StatCard 
          title="Current Faculty" 
          value={staff.length} 
          icon={UserCircle} 
          subtext={`${activeStaff} active accounts`}
          color="emerald" 
        />
        <StatCard 
          title="Rooms in Activity" 
          value={`${roomsInUseCount}/${rooms.length}`} 
          icon={DoorOpen} 
          subtext={`${Math.round((roomsInUseCount / (rooms.length || 1)) * 100)}% occupancy`}
          color="amber" 
        />
        <StatCard 
          title="Active Sessions" 
          value={sessions.length} 
          icon={TrendingUp}
          subtext="Sessions scheduled this week"
          color="rose" 
        />
      </div>

      {/* Recent Activity (superadmin only, hidden until audit rows exist) */}
      {appRole === 'superadmin' && activity.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activity.map(log => {
              const { action, actor, target } = auditLine(log, staff);
              return (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                    <Clock size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {action}
                      {target && <span className="font-normal text-slate-500"> → {target}</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{actor} · {new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Activity Load (Today)</h2>
          </div>
          
          <div className="h-64 relative flex items-end justify-between gap-2">
            {[8, 9, 10, 11, 12, 1, 2, 3, 4, 5].map((hour, i) => {
              const displayHour = i + 8; // 8am to 5pm
              const count = sessions.filter(s => displayHour >= s.startHour && displayHour < (s.startHour + s.span)).length;
              const height = Math.min(count * 25, 100); 
              
              return (
                <div key={i} className="flex flex-col items-center flex-1 gap-2 group">
                  <div className="w-full relative h-[200px] flex items-end justify-center">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className={`w-full max-w-[40px] rounded-t-lg mx-1 transition-colors ${
                        height > 75 ? 'bg-indigo-500' : 'bg-indigo-200'
                      } group-hover:bg-indigo-400`}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-400">{hour}{hour === 12 ? 'pm' : (i < 4 ? 'am' : 'pm')}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Critical Conflicts</h2>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${conflicts.length > 0 ? 'bg-rose-100 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:text-emerald-300'}`}>
              {conflicts.length}
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px]">
            {conflicts.length > 0 ? conflicts.map((conflict, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-xl border border-rose-100 bg-rose-50/50">
                <div className="mt-0.5 text-rose-600 dark:text-rose-400">
                  <AlertCircle size={18} strokeWidth={2.5}/>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {conflict.type === 'therapist' ? 'Therapist Busy' : 'Room Overlap'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-tight">
                    {conflict.type === 'therapist' 
                      ? `${staff.find(s => String(s.id) === String(conflict.therapistId))?.name} is double-booked at ${conflict.startHour}:00.`
                      : `${conflict.room} has multiple sessions at ${conflict.startHour}:00.`}
                  </p>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Clock size={32} className="text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-400">No conflicts detected today.</p>
              </div>
            )}
          </div>
          
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
