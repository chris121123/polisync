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

const fieldClass = 'w-full border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2.5 text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)]';
const labelClass = 'sa-label';

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
            <p className="border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2.5 text-sm text-[var(--sa-text-primary)]">Student</p>
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
              Contact Email <span className="ml-1 lowercase text-[var(--sa-text-muted)]">(optional)</span>
            </label>
            <input
              id="record-email"
              type="email"
              className={clsx(
                fieldClass,
                formData.email && emailInvalid && 'border-[var(--sa-danger)]'
              )}
              placeholder="email@polisync.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            {formData.email && emailInvalid && (
              <p className="mt-1 flex items-center gap-1 text-[11px] sa-t-danger">
                <AlertCircle size={10} strokeWidth={1.5} /> Enter a valid email address
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-3 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
        <button
          type="button"
          onClick={handleClose}
          className="sa-btn flex-1 justify-center min-h-11"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { onAdd(formData); handleClose(); }}
          disabled={!formData.name || !formData.role || emailInvalid}
          className="sa-btn sa-btn--primary flex-1 justify-center min-h-11 disabled:cursor-not-allowed disabled:opacity-40"
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 sa-rule-b gap-4">
        <div>
          <h1 className="sa-title">Staff & Student Directory</h1>
          <p className="sa-sub">Manage profiles and assigned programs.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="sa-btn sa-btn--primary"
        >
          <Plus size={16} strokeWidth={1.5}/> Add New Record
        </button>
      </div>

      <div className="border border-[var(--sa-line-default)] border-b-0 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sa-text-muted)]" size={16} strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search by name, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-[var(--sa-bg-base)] border border-[var(--sa-line-default)] text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)]"
          />
        </div>

        <div className="flex divide-x divide-[var(--sa-line-default)] border border-[var(--sa-line-default)] overflow-x-auto w-full sm:w-auto hide-scrollbar">
          {['All', 'Staff', 'Student', 'Rehab', 'SPED', 'Playschool', 'Admin'].map(f => {
            const count = f === 'All'
              ? combinedData.length
              : combinedData.filter(i => i.type === f || i.department === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={clsx(
                  "px-3 py-1.5 text-xs whitespace-nowrap flex items-center gap-1.5",
                  filterType === f
                    ? "text-[var(--sa-text-primary)] outline-1 outline-[var(--sa-gold)] -outline-offset-1"
                    : "text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                )}
              >
                <span>{f}</span>
                <span className="text-[11px] tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border text-sm border-[var(--sa-line-default)] overflow-hidden flex-1 mb-8">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-[var(--sa-line-default)]">
                <th className="px-6 py-4 font-normal text-[var(--sa-text-muted)] w-1/3 text-xs">Name</th>
                <th className="px-6 py-4 font-normal text-[var(--sa-text-muted)] text-xs">Role / Program</th>
                <th className="px-6 py-4 font-normal text-[var(--sa-text-muted)] text-xs">Department</th>
                <th className="px-6 py-4 font-normal text-[var(--sa-text-muted)] text-xs">Status</th>
                <th className="px-6 py-4 font-normal text-[var(--sa-text-muted)] text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sa-line-hairline)]">
              {filteredData.length > 0 ? filteredData.map((row) => (
                <tr key={`${row.type}-${row.id}`} className="hover:bg-[var(--sa-surface-2)] group">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 border border-[var(--sa-line-default)] flex items-center justify-center text-[11px] tabular-nums shrink-0 sa-t-warm">
                        {getInitials(row.name)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/profile/${row.id}?type=${row.type.toLowerCase()}`}
                          className="text-sm text-[var(--sa-text-primary)] py-1 hover:text-[var(--sa-gold)] block truncate"
                        >
                          {row.name}
                        </Link>
                        <p className="text-[11px] text-[var(--sa-text-muted)] capitalize">
                          {row.type === 'Staff' ? (row.app_role || 'Staff') : row.type}
                          {row.email ? ` • ${row.email}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-[var(--sa-text-muted)]">{row.role}</td>
                  <td className="px-6 py-3.5">
                    <span className="sa-badge">
                      {row.department}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={clsx(
                      "sa-badge",
                      row.status === 'Active' || row.status === 'Enrolled' ? "sa-badge--positive" : ""
                    )}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Link
                        to={`/profile/${row.id}?type=${row.type.toLowerCase()}`}
                        className="sa-link"
                      >
                        <span>View</span>
                        <ArrowUpRight size={13} strokeWidth={1.5} />
                      </Link>
                      {row.type === 'Student' && (
                        <button
                          type="button"
                          onClick={() => setStudentToDelete(row)}
                          className="sa-link"
                          aria-label={`Delete ${row.name}`}
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <FileText size={20} strokeWidth={1.5} className="mx-auto mb-3 text-[var(--sa-text-muted)]" />
                    <p className="sa-empty-title">No results found.</p>
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
            <AlertTriangle size={18} strokeWidth={1.5} className="shrink-0 sa-t-danger" />
            <div className="space-y-2">
              <p className="sa-row-title">
                Remove {studentToDelete?.name}?
              </p>
              <p className="text-sm text-[var(--sa-text-muted)]">
                This permanently deletes the student profile, program requirements, availability and parent links.
                {assignedSessionCount > 0 && (
                  <> They will also be removed from {assignedSessionCount} scheduled session{assignedSessionCount === 1 ? '' : 's'}.</>
                )}
                {' '}This cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-3 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={closeDeleteModal}
            disabled={isDeleting}
            className="sa-btn flex-1 justify-center min-h-11 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="flex-1 border border-[var(--sa-danger)] py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--sa-danger)] transition-colors hover:border-[var(--sa-line-strong)] disabled:cursor-default disabled:opacity-50"
          >
            {isDeleting ? 'Deleting…' : 'Delete Student'}
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default Directory;
