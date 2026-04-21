import React from 'react';
import { motion } from 'framer-motion';
import { Users, GraduationCap, Calendar, Home, Activity, ShieldCheck, UserPlus } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';

const AdminDashboard = () => {
  const { staff, students, sessions, rooms } = useGlobalState();

  const stats = [
    { label: "Total Staff", value: staff.length, icon: Users, color: "bg-blue-500" },
    { label: "Total Students", value: students.length, icon: GraduationCap, color: "bg-emerald-500" },
    { label: "Active Sessions", value: sessions.length, icon: Calendar, color: "bg-indigo-500" },
    { label: "Managed Rooms", value: rooms.length, icon: Home, color: "bg-amber-500" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Admin Command Center</h2>
          <p className="text-slate-500 font-medium mt-1 text-lg">System-wide overview and management</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
            <UserPlus size={18} />
            Add New Staff
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none mt-1">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" />
                System Health & Logs
              </h3>
              <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase rounded tracking-widest border border-emerald-100 flex items-center gap-1">
                <ShieldCheck size={10} />
                Secure
              </span>
            </div>
            <div className="p-0">
              <div className="divide-y divide-slate-50">
                {[1, 2, 3, 4, 5].map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <Users size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">New Staff Member Added</p>
                        <p className="text-xs text-slate-500">Admin registered Sarah G. as 'Lead Teacher'</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-400">2h ago</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 transition-colors uppercase tracking-widest">
                View All System Logs
              </button>
            </div>
          </div>
        </div>

        {/* Staff Quick View */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Staff On-Duty</h3>
            <div className="space-y-4">
              {staff.slice(1, 5).map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none">{s.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.role}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
