import React, { useState } from 'react';
import { Search, Plus, FileText, ArrowUpRight, X, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';

const AddRecordModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: 'SPED',
    type: 'Student',
    status: 'Active',
    email: '',
    phone: '',
    joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add Folder / Record</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Full Name</label>
            <input 
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
              placeholder="e.g., John Doe"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Category</label>
            <select 
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              <option value="Student">Student</option>
              <option value="Staff">Staff / Provider</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Program / Role</label>
            <input 
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
              placeholder="e.g., ASD Program"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
            />
          </div>
          <div>
             <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Department</label>
             <select 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
                value={formData.department}
                onChange={e => setFormData({...formData, department: e.target.value})}
              >
                <option value="SPED">SPED</option>
                <option value="Rehab">Rehab</option>
                <option value="Playschool">Playschool</option>
                <option value="Admin">Admin</option>
              </select>
          </div>
          <div>
             <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Contact Email *</label>
             <input 
                type="email"
                className={clsx(
                  "w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border rounded-xl outline-none focus:border-indigo-500 text-sm font-medium",
                  formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 dark:border-slate-700'
                )}
                placeholder="email@polisync.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1"><AlertCircle size={10} /> Enter a valid email address</p>
              )}
          </div>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
          <button 
            onClick={() => { onAdd(formData); onClose(); }}
            disabled={!formData.name || !formData.role || !formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)}
            className="flex-1 py-3 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Save Record
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Directory = () => {
  const { staff, students, addPerson } = useGlobalState();
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const combinedData = [...staff, ...students];

  const filteredData = combinedData.filter(item => {
    const matchesFilter = filterType === 'All' ? true : item.type === filterType || item.department === filterType;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Staff & Student Directory</h1>
          <p className="text-slate-500 font-medium mt-1">Manage profiles and assigned programs.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
        >
          <Plus size={18} strokeWidth={2.5}/> Add New Record
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-t-2xl p-4 border border-slate-200 dark:border-slate-700 border-b-0 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow text-sm font-medium"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
          {['All', 'Staff', 'Student', 'Rehab', 'SPED', 'Playschool', 'Admin'].map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={clsx(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border",
                filterType === f 
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm" 
                  : "bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 border text-sm border-slate-200 dark:border-slate-700 rounded-b-2xl overflow-hidden shadow-sm flex-1 mb-8">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 w-1/3">Name</th>
                <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">Role / Program</th>
                <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">Department</th>
                <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">Status</th>
                <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((row) => (
                <tr key={`${row.type}-${row.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0">
                        {row.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{row.name}</p>
                        <p className="text-xs font-medium text-slate-500">{row.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{row.role}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {row.department}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold",
                      row.status === 'Active' || row.status === 'Enrolled' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                    )}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/profile/${row.id}?type=${row.type.toLowerCase()}`}
                      className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-900/30 transition-colors"
                    >
                      <ArrowUpRight size={18} strokeWidth={2.5}/>
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No results found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AddRecordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={addPerson} />
    </div>
  );
};

export default Directory;
