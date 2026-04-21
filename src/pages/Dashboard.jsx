import React from 'react';
import { Users, UserCircle, DoorOpen, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';

const StatCard = ({ title, value, icon: Icon, trend, subtext, color = "indigo" }) => {
  const colorMap = {
    indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800",
    emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100",
    amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100",
    rose: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/60 transition-shadow hover:shadow-md"
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

const Dashboard = () => {
  const { staff, students, rooms, sessions, conflicts } = useGlobalState();
  
  // Calculate rooms in use by counting unique rooms in sessions
  const roomsInUseCount = new Set(sessions.map(s => s.room)).size;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard Overview</h1>
        <p className="text-slate-500 font-medium">Here's what's happening at the center today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Students" 
          value={students.length} 
          icon={Users} 
          trend={12} 
          subtext="Enrolled capacity"
          color="indigo" 
        />
        <StatCard 
          title="Current Faculty" 
          value={staff.length} 
          icon={UserCircle} 
          subtext="Available on roster"
          color="emerald" 
        />
        <StatCard 
          title="Rooms in Activity" 
          value={`${roomsInUseCount}/${rooms.length}`} 
          icon={DoorOpen} 
          subtext={`${Math.round((roomsInUseCount / rooms.length) * 100)}% occupancy`}
          color="amber" 
        />
        <StatCard 
          title="Active Sessions" 
          value={sessions.length} 
          icon={TrendingUp} 
          trend={-2} 
          subtext="Sessions scheduled"
          color="rose" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Activity Load (Today)</h2>
          </div>
          
          <div className="h-64 relative flex items-end justify-between gap-2">
            {[8, 9, 10, 11, 12, 1, 2, 3, 4, 5].map((hour, i) => {
              // Count sessions starting or occurring during this hour
              const displayHour = i + 8; // 8am to 5pm
              const count = sessions.filter(s => displayHour >= s.startHour && displayHour < (s.startHour + s.span)).length;
              const height = Math.min(count * 25, 100); // Scale up for visibility
              
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

        <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
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
          
          <button className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors">
            Analyze Roster
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;
