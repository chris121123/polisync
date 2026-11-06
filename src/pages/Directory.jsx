import React, { useState } from 'react';
import { Search, Plus, FileText, ArrowUpRight, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { AppModal, ModalHeader } from '../components/AppModal.jsx';
import ItxSelect from '../components/ItxSelect.jsx';
import { useGlobalState } from '../context/GlobalStateContext';
import { ROLE_LABELS } from '../lib/rolePalette';

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const rowMeta = (row) => `${row.type === 'Staff' ? (ROLE_LABELS[row.app_role] || row.app_role || 'Staff') : row.type}${row.email ? ` • ${row.email}` : ''}`;

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

const fieldClass = 'w-full border bg-[var(--sa-bg-base)] px-3 text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)]';
// The border colour is chosen, never raced: two border-* utilities in one
// className resolve by CSS order, not by class order (UserManagement does the same).
const fieldTone = (invalid) => (invalid
  ? 'border-[var(--sa-danger)]'
  : 'border-[var(--sa-line-default)]');
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
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="record-name" className={labelClass}>Full Name</label>
            <input
              id="record-name"
              data-autofocus
              className={clsx(fieldClass, fieldTone(false))}
              placeholder="FirstName LastName"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <p className={labelClass}>Category</p>
            <p className="flex h-11 items-center border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 text-[15px] text-[var(--ink-primary)]">Student</p>
          </div>

          <div>
            <label htmlFor="record-role" className={labelClass}>Program / Role</label>
            <input
              id="record-role"
              className={clsx(fieldClass, fieldTone(false))}
              placeholder="e.g., ASD Program"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="record-department" className={labelClass}>Department</label>
            <ItxSelect
              id="record-department"
              value={formData.department}
              onChange={(department) => setFormData({ ...formData, department })}
              className={clsx(fieldClass, fieldTone(false))}
              options={['SPED', 'Rehab', 'Playschool', 'Admin'].map((department) => ({ value: department, label: department }))}
            />
          </div>

          <div>
            <label htmlFor="record-email" className={labelClass}>
              Contact Email <span className="ml-1 lowercase text-[var(--sa-text-muted)]">(optional)</span>
            </label>
            <input
              id="record-email"
              type="email"
              aria-invalid={formData.email && emailInvalid ? 'true' : undefined}
              aria-describedby={formData.email && emailInvalid ? 'record-email-error' : undefined}
              className={clsx(
                fieldClass,
                fieldTone(formData.email && emailInvalid)
              )}
              placeholder="email@polisync.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            {formData.email && emailInvalid && (
              <p id="record-email-error" className="mt-1 flex items-center gap-1 text-[11px] sa-t-danger">
                <AlertCircle size={10} strokeWidth={1.5} /> Enter a valid email address
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-3 px-5 py-4 md:px-6">
        <button
          type="button"
          onClick={handleClose}
          className="sa-btn flex-1 justify-center"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { onAdd(formData); handleClose(); }}
          disabled={!formData.name || !formData.role || emailInvalid}
          className="sa-btn sa-btn--primary flex-1 justify-center"
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between shrink-0">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sa-text-muted)]" size={16} strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search by name, role..."
            aria-label="Search directory"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sa-input"
          />
        </div>

        <div className="flex flex-wrap items-center">
          {['All', 'Staff', 'Student', 'Rehab', 'SPED', 'Playschool', 'Admin'].map(f => {
            const count = f === 'All'
              ? combinedData.length
              : combinedData.filter(i => i.type === f || i.department === f).length;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilterType(f)}
                aria-pressed={filterType === f}
                className={clsx(
                  'itx-tab whitespace-nowrap tabular-nums',
                  filterType === f && 'is-active'
                )}
              >
                <span>{f}</span>
                <span className="text-[11px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="itx-card overflow-x-auto">
        <table className="itx-table table-fixed text-left sm:min-w-[640px]">
          <thead>
            <tr>
              <th scope="col" className="w-[32%] text-left">Name</th>
              <th scope="col" className="w-[23%] text-left">Role / Program</th>
              <th scope="col" className="w-[15%] text-left">Department</th>
              <th scope="col" className="w-[11%] text-left">Status</th>
              <th scope="col" className="w-[19%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? filteredData.map((row) => (
              <tr key={`${row.type}-${row.id}`}>
                <td data-mobile="title">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-[var(--surface-sunken)] text-[11px] font-medium text-[var(--ink-avatar)]" style={{ borderRadius: 'var(--x-radius-chip)' }}>
                      {getInitials(row.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <Link
                          to={`/profile/${row.id}?type=${row.type.toLowerCase()}`}
                          className="min-w-0 flex-1 truncate text-sm text-[var(--ink-primary)] hover:underline"
                        >
                          {row.name}
                        </Link>
                        <span
                          title={row.email || undefined}
                          className="hidden min-w-0 max-w-[45%] truncate text-[11px] text-[var(--ink-muted)] capitalize xl:inline"
                        >
                          {rowMeta(row)}
                        </span>
                      </div>
                      <p title={row.email || undefined} className="mt-0.5 truncate text-[11px] text-[var(--ink-muted)] capitalize xl:hidden">
                        {rowMeta(row)}
                      </p>
                    </div>
                  </div>
                </td>
                <td data-mobile="meta" className="truncate text-sm text-[var(--ink-body)]">{row.role}</td>
                <td data-mobile="meta">
                  <span className="sa-badge whitespace-nowrap">
                    {row.department}
                  </span>
                </td>
                <td data-mobile="meta">
                  <span className={clsx(
                    "sa-badge whitespace-nowrap",
                    row.status === 'Active' || row.status === 'Enrolled' ? "sa-badge--positive" : ""
                  )}>
                    {row.status}
                  </span>
                </td>
                <td data-mobile="action" className="text-right">
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
        <div className="flex shrink-0 gap-3 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={closeDeleteModal}
            disabled={isDeleting}
            className="sa-btn flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="sa-btn itx-danger flex-1 justify-center"
          >
            {isDeleting ? 'Deleting…' : 'Delete Student'}
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default Directory;
