import React, { useState } from 'react';
import { Search, Plus, FileText, ArrowUpRight, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { AppModal, ModalHeader } from '../components/AppModal.jsx';
import { useGlobalState } from '../context/GlobalStateContext';

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const isValidEmail = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const createEmptyRecord = () => ({
  name: '',
  role: '',
  department: 'SPED',
  type: 'Student',
  status: 'Active',
  email: '',
  phone: '',
  joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
});

const fieldClass = 'w-full rounded-xl border border-ps-border bg-ps-bg px-4 py-3 text-sm font-medium text-ps-ink-1 outline-none transition-all focus:border-ps-accent focus:ring-2 focus:ring-ps-accent/20';
const labelClass = 'mb-1.5 block text-xs font-medium text-ps-ink-2';

const AddRecordModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState(createEmptyRecord);

  const handleClose = () => {
    setFormData(createEmptyRecord());
    onClose();
  };

  const emailInvalid = !isValidEmail(formData.email);

  return (
    <AppModal isOpen={isOpen} onClose={handleClose} labelledBy="add-record-title">
      <ModalHeader
        titleId="add-record-title"
        eyebrow="Directory"
        title="Add Student Record"
        description="Create a student profile and program assignment."
        onClose={handleClose}
        className="bg-[var(--sa-surface-warm)]"
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="record-name" className={labelClass}>Full Name</label>
            <input
              id="record-name"
              data-autofocus
              className={fieldClass}
              placeholder="FirstName LastName"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <p className={labelClass}>Category</p>
            <p className="rounded-xl border border-ps-border bg-ps-bg px-4 py-3 text-sm font-medium text-ps-ink-1">Student</p>
          </div>

          <div>
            <label htmlFor="record-role" className={labelClass}>Program / Role</label>
            <input
              id="record-role"
              className={fieldClass}
              placeholder="e.g., ASD Program"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="record-department" className={labelClass}>Department</label>
            <select
              id="record-department"
              className={fieldClass}
              value={formData.department}
              onChange={e => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="SPED">SPED</option>
              <option value="Rehab">Rehab</option>
              <option value="Playschool">Playschool</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div>
            <label htmlFor="record-email" className={labelClass}>
              Contact Email <span className="ml-1 font-medium lowercase text-ps-ink-2">(optional)</span>
            </label>
            <input
              id="record-email"
              type="email"
              className={clsx(
                fieldClass,
                formData.email && emailInvalid && 'border-ps-danger bg-ps-danger/10 focus:border-ps-danger focus:ring-ps-danger/20'
              )}
              placeholder="email@polisync.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            {formData.email && emailInvalid && (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-ps-danger">
                <AlertCircle size={10} /> Enter a valid email address
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-3 border-t border-ps-border bg-ps-surface px-5 py-4 md:px-6">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 rounded-xl border border-ps-border py-3 text-sm font-medium text-ps-ink-2 transition-colors hover:bg-ps-bg"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { onAdd(formData); handleClose(); }}
          disabled={!formData.name || !formData.role || emailInvalid}
          className="flex-1 rounded-xl bg-ps-primary py-3 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-default disabled:opacity-50"
        >
          Save Record
        </button>
      </div>
    </AppModal>
  );
};

const Directory = () => {
  const { staff, students, sessions, addPerson, deleteStudent } = useGlobalState();
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const combinedData = [...staff, ...students];

  const filteredData = combinedData.filter(item => {
    const matchesFilter = filterType === 'All' ? true : item.type === filterType || item.department === filterType;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const assignedSessionCount = studentToDelete
    ? sessions.filter(s => (s.studentIds || []).some(id => String(id) === String(studentToDelete.id))).length
    : 0;

  const closeDeleteModal = () => {
    if (!isDeleting) setStudentToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    const removed = await deleteStudent(studentToDelete);
    setIsDeleting(false);
    if (removed) setStudentToDelete(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col space-y-6 lg:space-y-8 animate-page-entry">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-ps-border/60 gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ps-ink-1 tracking-tight">Staff & Student Directory</h1>
          <p className="text-xs text-ps-ink-2 font-medium mt-0.5">Manage profiles and assigned programs.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-ps-primary hover:opacity-90 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all"
        >
          <Plus size={16} strokeWidth={2.5}/> Add New Record
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
                    ? "bg-ps-primary text-white border-ps-accent shadow-sm"
                    : "bg-ps-surface text-ps-ink-2 border-ps-border hover:bg-ps-bg hover:text-ps-ink-1"
                )}
              >
                <span>{f}</span>
                <span className={clsx(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                  filterType === f ? "bg-black/25 text-white" : "bg-ps-bg text-ps-ink-2"
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
          <table className="w-full text-left border-collapse min-w-[620px]">
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
                          className="font-medium text-sm text-ps-ink-1 py-1 hover:text-ps-accent transition-colors block truncate"
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
                    <div className="inline-flex items-center gap-1">
                      <Link
                        to={`/profile/${row.id}?type=${row.type.toLowerCase()}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-ps-ink-2 hover:text-ps-ink-1 hover:bg-ps-surface border border-transparent hover:border-ps-border transition-all"
                      >
                        <span>View</span>
                        <ArrowUpRight size={13} />
                      </Link>
                      {row.type === 'Student' && (
                        <button
                          type="button"
                          onClick={() => setStudentToDelete(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1 text-xs font-medium text-ps-ink-2 transition-all hover:border-ps-danger/20 hover:bg-ps-danger/10 hover:text-ps-danger"
                          aria-label={`Delete ${row.name}`}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
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

      <AppModal
        isOpen={!!studentToDelete}
        onClose={closeDeleteModal}
        maxWidth="max-w-md"
        labelledBy="delete-student-title"
      >
        <ModalHeader
          titleId="delete-student-title"
          eyebrow="Directory"
          title="Delete student record"
          onClose={closeDeleteModal}
          className="bg-[var(--sa-surface-warm)]"
        />
        <div className="px-5 py-5 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ps-danger/10 text-ps-danger">
              <AlertTriangle size={18} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ps-ink-1">
                Remove {studentToDelete?.name}?
              </p>
              <p className="text-sm font-medium text-ps-ink-2">
                This permanently deletes the student profile, program requirements, availability and parent links.
                {assignedSessionCount > 0 && (
                  <> They will also be removed from {assignedSessionCount} scheduled session{assignedSessionCount === 1 ? '' : 's'}.</>
                )}
                {' '}This cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-3 border-t border-ps-border bg-ps-surface px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={closeDeleteModal}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-ps-border py-3 text-sm font-medium text-ps-ink-2 transition-colors hover:bg-ps-bg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-[var(--sa-danger)] py-3 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--sa-danger)] transition-colors hover:border-[var(--sa-line-strong)] disabled:cursor-default disabled:opacity-50"
          >
            {isDeleting ? 'Deleting…' : 'Delete Student'}
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default Directory;
