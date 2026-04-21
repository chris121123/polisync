import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ScheduleCalendar from './pages/ScheduleCalendar';
import Directory from './pages/Directory';
import ProfilePage from './pages/ProfilePage';
import Rooms from './pages/Rooms';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import { useGlobalState } from './context/GlobalStateContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user } = useGlobalState();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useGlobalState();
  if (!user || user.role !== 'Admin') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  const { darkMode, loading, toast, notify } = useGlobalState();

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center z-[9999]">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-bold animate-pulse">Initializing PoliSync...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Dashboard Routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="schedule" element={<ScheduleCalendar />} />
          <Route path="directory" element={<Directory />} />
          <Route path="profile/:id" element={<ProfilePage />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-6 right-6 z-[10000] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md"
            style={{
              backgroundColor: toast.type === 'error' ? 'rgba(254, 242, 242, 0.9)' : toast.type === 'success' ? 'rgba(236, 253, 245, 0.9)' : 'rgba(239, 246, 255, 0.9)',
              borderColor: toast.type === 'error' ? '#fee2e2' : toast.type === 'success' ? '#d1fae5' : '#dbeafe',
              color: toast.type === 'error' ? '#991b1b' : toast.type === 'success' ? '#065f46' : '#1e40af'
            }}
          >
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'success' && <CheckCircle2 size={20} />}
            {toast.type === 'info' && <Info size={20} />}
            <p className="text-sm font-bold">{toast.message}</p>
            <button 
              onClick={() => notify(null)}
              className="ml-2 p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Router>
  );
}

export default App;
