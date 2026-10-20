import React, { useState } from 'react';
import { Search, Plus, FileText, ArrowUpRight, X, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

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
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-ps-surface rounded-xl shadow-md w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-ps-border flex justify-between items-center">
          <h3 className="text-xl font-semibold text-ps-ink-1">Add Student Record</h3>
          <button onClick={onClose} className="p-2 hover:bg-ps-bg rounded-full text-ps-ink-2 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-medium text-ps-ink-2 mb-1.5 block">Full Name</label>
            <input 
              className="w-full px-4 py-2 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent text-sm font-medium"
              placeholder="FirstName LastName"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-ps-ink-2 mb-1.5 block">Category</p>
            <p className="text-sm font-medium text-ps-ink-1 px-4 py-2 bg-ps-bg border border-ps-border rounded-xl">Student</p>
          </div>
          <div>
            <label className="text-xs font-medium text-ps-ink-2 mb-1.5 block">Program / Role</label>
            <input 
              className="w-full px-4 py-2 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent text-sm font-medium"
              placeholder="e.g., ASD Program"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
            />
          </div>
          <div>
             <label className="text-xs font-medium text-ps-ink-2 mb-1.5 block">Department</label>
             <select 
                className="w-full px-4 py-2 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent text-sm font-medium"
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
             <label className="text-xs font-medium text-ps-ink-2 mb-1.5 block">
               Contact Email <span className="normal-case lowercase font-medium text-ps-ink-2 ml-1">(optional)</span>
             </label>
             <input 
                type="email"
                className={clsx(
                  "w-full px-4 py-2 bg-ps-bg border rounded-xl outline-none focus:border-ps-accent text-sm font-medium",
                  formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-ps-danger bg-ps-danger/10' : 'border-ps-border'
                )}
                placeholder="email@polisync.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                <p className="text-xs text-ps-danger font-medium mt-1 flex items-center gap-1"><AlertCircle size={10} /> Enter a valid email address</p>
              )}
          </div>
        </div>
        <div className="p-6 bg-ps-bg flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-medium text-ps-ink-2 hover:bg-ps-surface rounded-xl transition-colors">Cancel</button>
          <button 
            onClick={() => { onAdd(formData); onClose(); }}
            disabled={!formData.name || !formData.role || (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))}
            className="flex-1 py-3 text-sm font-medium bg-ps-accent text-ps-surface rounded-xl hover:bg-ps-accent disabled:opacity-50 disabled:hover:bg-ps-accent disabled:cursor-default transition-colors"
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
          <h1 className="text-2xl font-semibold text-ps-ink-1">Staff & Student Directory</h1>
          <p className="text-ps-ink-2 font-medium mt-1">Manage profiles and assigned programs.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-ps-accent hover:bg-ps-accent text-ps-surface px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={18} strokeWidth={2.5}/> Add New Record
        </button>
      </div>

      <div className="bg-ps-surface rounded-t-2xl p-4 border border-ps-border border-b-0 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ps-ink-2" size={18} />
          <input
            type="text"
            placeholder="Search by name, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent focus:ring-1 focus:ring-ps-accent transition-shadow text-sm font-medium"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
          {['All', 'Staff', 'Student', 'Rehab', 'SPED', 'Playschool', 'Admin'].map(f => {
            const count = f === 'All' 
              ? combinedData.length 
              : combinedData.filter(i => i.type === f || i.department === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap border flex items-center gap-1.5",
                  filterType === f 
                    ? "bg-ps-accent text-white border-ps-accent shadow-sm" 
                    : "bg-ps-surface text-ps-ink-2 border-ps-border hover:bg-ps-bg hover:text-ps-ink-1"
                )}
              >
                <span>{f}</span>
                <span className={clsx(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                  filterType === f ? "bg-white/20 text-white" : "bg-ps-bg text-ps-ink-2"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-ps-surface border text-sm border-ps-border rounded-b-2xl overflow-hidden shadow-sm flex-1 mb-8">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ps-bg border-b border-ps-border">
                <th className="px-6 py-4 font-medium text-ps-ink-2 w-1/3">Name</th>
                <th className="px-6 py-4 font-medium text-ps-ink-2">Role / Program</th>
                <th className="px-6 py-4 font-medium text-ps-ink-2">Department</th>
                <th className="px-6 py-4 font-medium text-ps-ink-2">Status</th>
                <th className="px-6 py-4 font-medium text-ps-ink-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ps-border">
              {filteredData.length > 0 ? filteredData.map((row) => (
                <tr key={`${row.type}-${row.id}`} className="hover:bg-ps-bg/60 transition-colors group">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 shadow-sm",
                        row.type === 'Staff'
                          ? "bg-ps-accent-soft text-ps-accent border border-ps-accent/20"
                          : "bg-ps-bg text-ps-ink-1 border border-ps-border"
                      )}>
                        {getInitials(row.name)}
                      </div>
                      <div className="min-w-0">
                        <Link 
                          to={`/profile/${row.id}?type=${row.type.toLowerCase()}`}
                          className="font-medium text-sm text-ps-ink-1 hover:text-ps-accent transition-colors block truncate"
                        >
                          {row.name}
                        </Link>
                        <p className="text-xs text-ps-ink-2 font-medium capitalize">
                          {row.type === 'Staff' ? (row.app_role || 'Staff') : row.type}
                          {row.email ? ` • ${row.email}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-ps-ink-2 font-medium">{row.role}</td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ps-bg text-ps-ink-1 border border-ps-border">
                      {row.department}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                      row.status === 'Active' || row.status === 'Enrolled' 
                        ? "bg-ps-success/10 text-ps-success border border-ps-success/20" 
                        : "bg-ps-bg text-ps-ink-2 border border-ps-border"
                    )}>
                      <span className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        row.status === 'Active' || row.status === 'Enrolled' ? "bg-ps-success" : "bg-ps-ink-2"
                      )} />
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link 
                      to={`/profile/${row.id}?type=${row.type.toLowerCase()}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-ps-ink-2 hover:text-ps-ink-1 hover:bg-ps-surface border border-transparent hover:border-ps-border transition-all"
                    >
                      <span>View</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-ps-border mb-3" />
                    <p className="text-ps-ink-2 font-medium">No results found.</p>
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
