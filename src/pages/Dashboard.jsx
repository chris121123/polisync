import React from 'react';
import { useGlobalState } from '../context/GlobalStateContext';
import AdminDashboard from './admin/AdminDashboard';
import TeacherDashboard from './teacher/TeacherDashboard';
import TherapistDashboard from './therapist/TherapistDashboard';
import ParentDashboard from './parent/ParentDashboard';

const Dashboard = () => {
  const { appRole } = useGlobalState();

  if (appRole === 'admin') {
    return <AdminDashboard />;
  }
  if (appRole === 'teacher') {
    return <TeacherDashboard />;
  }
  if (appRole === 'therapist') {
    return <TherapistDashboard />;
  }
  if (appRole === 'parent') {
    return <ParentDashboard />;
  }

  // Fallback if role is not recognized yet
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default Dashboard;
