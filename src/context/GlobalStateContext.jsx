import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { findAllConflicts } from '../lib/scheduling/conflicts';
import { createNotificationActions } from '../state/notifications';
import { createUserAdminActions } from '../state/userAdmin';
import { createRoomActions } from '../state/rooms';
import { createDirectoryActions } from '../state/directory';
import { createSessionActions } from '../state/sessions';
import { createSettingsActions } from '../state/settings';
import { createAttendanceActions } from '../state/attendance';
import { createSchedulingActions } from '../state/scheduling';
import { createAuthActions } from '../state/auth';

const GlobalStateContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) throw new Error('useGlobalState must be used within a GlobalStateProvider');
  return context;
};

// ─── No mock data functions ──────────────────────────────────────────────────

// ─── Provider ─────────────────────────────────────────────────────────────────

export const GlobalStateProvider = ({ children }) => {
  // --- STATE INITIALIZATION ---
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [studentPrograms, setStudentPrograms] = useState([]);
  const [studentAvailability, setStudentAvailability] = useState([]);
  const [staffAvailability, setStaffAvailabilityState] = useState([]);
  const [schedulingSettings, setSchedulingSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // --- SUPABASE INTEGRATION ---

  // Core tables are authenticated-only (RLS): load them after an authorized session exists.
  const loadCoreData = useCallback(async () => {
    const [
      roomsRes,
      staffRes,
      studentsRes,
      sessionsRes,
      staffAvailRes,
      programsRes,
      spRes,
      saRes,
      settingsRes
    ] = await Promise.allSettled([
      supabase.from('rooms').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('students').select('*'),
      supabase.from('sessions').select('*'),
      supabase.from('staff_availability').select('*'),
      supabase.from('programs').select('*').eq('is_active', true),
      supabase.from('student_programs').select('*'),
      supabase.from('student_availability').select('*').eq('is_active', true),
      supabase.from('scheduling_settings').select('*').single()
    ]);

    if (roomsRes.status === 'fulfilled' && roomsRes.value.data) {
      setRooms(roomsRes.value.data.map(r => ({ ...r, maxCapacity: r.max_capacity })));
    }
    if (staffRes.status === 'fulfilled' && staffRes.value.data) {
      setStaff(staffRes.value.data);
    }
    if (studentsRes.status === 'fulfilled' && studentsRes.value.data) {
      setStudents(studentsRes.value.data);
    }
    if (sessionsRes.status === 'fulfilled' && sessionsRes.value.data) {
      setSessions(sessionsRes.value.data.map(s => ({
        id: s.id,
        title: s.title,
        therapistId: s.therapist_id,
        studentIds: s.student_ids || [],
        room: s.room,
        startHour: s.start_hour,
        span: s.span,
        type: s.type,
        programId: s.program_id,
        dayOfWeek: s.day_of_week,
        sessionDate: s.session_date || null,
        isConfirmed: s.is_confirmed
      })));
    }
    if (staffAvailRes.status === 'fulfilled' && staffAvailRes.value.data) {
      setStaffAvailabilityState(staffAvailRes.value.data);
    }
    if (programsRes.status === 'fulfilled' && programsRes.value.data) {
      setPrograms(programsRes.value.data.map(p => ({ ...p, id: Number(p.id) })));
    }
    if (spRes.status === 'fulfilled' && spRes.value.data) {
      setStudentPrograms(spRes.value.data.map(sp => ({ ...sp, student_id: Number(sp.student_id), program_id: Number(sp.program_id) })));
    }
    if (saRes.status === 'fulfilled' && saRes.value.data) {
      setStudentAvailability(saRes.value.data.map(sa => ({ ...sa, student_id: Number(sa.student_id) })));
    }
    if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
      setSchedulingSettings(settingsRes.value.data);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      
      setLoading(true);

      // Fail-safe timer: guarantee loading spinner never stays indefinitely (e.g. mobile lock / network lag)
      const safetyTimer = setTimeout(() => {
        if (mounted) {
          console.warn('Initialization safety timeout reached (4s). Releasing loading state.');
          setLoading(false);
        }
      }, 4000);
      
      try {
        // 1. Fetch Auth Session with timeout to avoid hanging on mobile/cross-origin locks
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 3000));
        const { data: sessionData } = await Promise.race([sessionPromise, timeoutPromise]);
        const session = sessionData?.session;
        
        if (session?.user) {
          // Fetch profile and role concurrently
          const [profileRes, roleRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            supabase.from('user_roles').select('role').eq('user_id', session.user.id).single()
          ]);
          
          if (!profileRes.data || !roleRes.data?.role || profileRes.data.is_active === false) {
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setAppRole(null);
            }
          } else {
            const finalRole = roleRes.data.role;
            if (mounted) {
              setUser({ ...profileRes.data, app_role: finalRole });
              setAppRole(finalRole);
            }

            await loadCoreData();

            supabase.from('notifications')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })
              .then(({ data }) => {
                if (mounted && data) setNotifications(data);
              });
          }
        }
        
      } catch (error) {
        console.error('Error fetching data during initialization:', error);
      } finally {
        clearTimeout(safetyTimer);
        if (mounted) setLoading(false);
      }
    };

    initializeSession();

    if (!supabase) return;

    // Listen for ongoing auth changes (login/logout from other tabs or account switch)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) {
        // Logout: clear all user-specific state
        setUser(null);
        setAppRole(null);
        setParentChildren([]);
        setMyAssignments([]);
        setNotifications([]);
      } else if (event === 'SIGNED_IN') {
        // Only re-fetch notifications for the newly signed-in user.
        // Do NOT touch loading or profile here — initializeSession handles the initial
        // load, and for account switches the login page handles navigation.
        // We use a short delay so initializeSession (which runs concurrently on
        // initial page load) can finish first.
        setTimeout(async () => {
          if (!mounted) return;
          try {
            const { data: notifData } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false });
            if (mounted) setNotifications(notifData || []);
          } catch (err) {
            console.error('onAuthStateChange notifications fetch error:', err);
          }
        }, 1500); // wait for initializeSession to settle
      } else if (event === 'PASSWORD_RECOVERY') {
        // The recovery link lands on /login, outside Layout, so the flag must also live in the DB.
        await supabase.from('profiles').update({ must_change_password: true }).eq('id', session.user.id);
        setUser(prev => prev ? { ...prev, must_change_password: true } : prev);
      }
    });

    // Listen for Real-time changes
    const channel = supabase.channel('system-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSessions(prev => {
            if (prev.some(s => s.id === payload.new.id)) return prev;
            return [...prev, {
              id: payload.new.id,
              title: payload.new.title,
              therapistId: payload.new.therapist_id,
              studentIds: payload.new.student_ids || [],
              room: payload.new.room,
              startHour: payload.new.start_hour,
              span: payload.new.span,
              type: payload.new.type,
              programId: payload.new.program_id,
              dayOfWeek: payload.new.day_of_week,
              sessionDate: payload.new.session_date || null,
              isConfirmed: payload.new.is_confirmed
            }];
          });
        } else if (payload.eventType === 'UPDATE') {
          setSessions(prev => prev.map(s => s.id === payload.new.id ? {
            ...s,
            title: payload.new.title,
            therapistId: payload.new.therapist_id,
            studentIds: payload.new.student_ids || [],
            room: payload.new.room,
            startHour: payload.new.start_hour,
            span: payload.new.span,
            type: payload.new.type,
            programId: payload.new.program_id,
            dayOfWeek: payload.new.day_of_week,
            sessionDate: payload.new.session_date || null,
            isConfirmed: payload.new.is_confirmed
          } : s));
        } else if (payload.eventType === 'DELETE') {
          setSessions(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.eventType === 'INSERT') setStaff(prev => [...prev, payload.new]);
        else if (payload.eventType === 'UPDATE') setStaff(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        else if (payload.eventType === 'DELETE') setStaff(prev => prev.filter(s => s.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        if (payload.eventType === 'INSERT') setStudents(prev => [...prev, payload.new]);
        else if (payload.eventType === 'UPDATE') setStudents(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        else if (payload.eventType === 'DELETE') setStudents(prev => prev.filter(s => s.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, (payload) => {
        if (payload.eventType === 'INSERT') setPrograms(prev => [...prev, payload.new]);
        else if (payload.eventType === 'UPDATE') setPrograms(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_programs' }, (payload) => {
        if (payload.eventType === 'INSERT') setStudentPrograms(prev => [...prev, payload.new]);
        else if (payload.eventType === 'UPDATE') setStudentPrograms(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_availability' }, (payload) => {
        if (payload.eventType === 'INSERT') setStudentAvailability(prev => [...prev, payload.new]);
        else if (payload.eventType === 'UPDATE') setStudentAvailability(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        else if (payload.eventType === 'DELETE') setStudentAvailability(prev => prev.filter(a => a.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_availability' }, (payload) => {
        if (payload.eventType === 'INSERT') setStaffAvailabilityState(prev => {
          if (prev.some(a => a.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        else if (payload.eventType === 'UPDATE') setStaffAvailabilityState(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        else if (payload.eventType === 'DELETE') setStaffAvailabilityState(prev => prev.filter(a => a.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_documents' }, (payload) => {
        // Notify staff that a parent has submitted a new document
        notify(`New document uploaded: "${payload.new.file_name}"`, 'info');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && payload.new && session?.user?.id === payload.new.user_id) {
          setNotifications(prev => {
            if (prev.some(n => n.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, async (payload) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && payload.new && session?.user?.id === payload.new.user_id) {
          setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, async (payload) => {
        // For delete, we might only get the old id (if REPLICA IDENTITY is default).
        // But if it's in our state, we can just try to remove it.
        if (mounted && payload.old) {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      channel.unsubscribe();
    };
  }, [loadCoreData]);

  // --- DERIVED STATE / ACTIONS ---

  // Check for conflicts
  const conflicts = useMemo(() => findAllConflicts(sessions), [sessions]);

  const [user, setUser] = useState(null);
  const [appRole, setAppRole] = useState(null);
  const [parentChildren, setParentChildren] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkModeState] = useState(() => {
    const saved = localStorage.getItem('polisync_dark_mode');
    return saved === 'true';
  });

  const setDarkMode = (val) => {
    setDarkModeState(val);
    localStorage.setItem('polisync_dark_mode', String(val));
  };

  const {
    createNotification,
    notifyRoleUsers,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    dispatchNotification,
  } = createNotificationActions({ setNotifications, user, staff });

  const {
    adminCreateUser,
    updateUserRole,
    adminDeleteUser,
    toggleUserActive,
  } = createUserAdminActions({
    user,
    staff,
    setStaff,
    setUser,
    setAppRole,
    notify,
    createNotification,
    notifyRoleUsers,
  });

  const { addRoom } = createRoomActions({ setRooms, notify });

  const { addPerson } = createDirectoryActions({ setStaff, setStudents, notify });

  const { addSession, moveSession, deleteSession } = createSessionActions({
    sessions,
    setSessions,
    notify,
    dispatchNotification,
    createNotification,
    notifyRoleUsers,
  });

  const { clearDatabase } = createSettingsActions({
    setLoading,
    setSessions,
    setStudents,
    setRooms,
    setStaff,
    user,
  });

  const {
    addSessionNote,
    markAttendance,
    fetchAttendance,
    assignParentToStudent,
  } = createAttendanceActions({ user, notify });

  const {
    login,
    logout,
    changePassword,
    isSuperAdmin,
    isAdmin,
    isParent,
    isTeacher,
    isTherapist,
    isTherapistOrTeacher,
  } = createAuthActions({
    user,
    appRole,
    setUser,
    setAppRole,
    setParentChildren,
    setMyAssignments,
    setNotifications,
    loadCoreData,
    notify,
  });

  const fetchParentChildren = useCallback(async () => {
    if (appRole !== 'parent') return;
    const { data } = await supabase
      .from('parent_student_relationships')
      .select('student_id, students(*)')
      .eq('parent_id', user?.id);
    if (data) setParentChildren(data.map(r => r.students));
  }, [appRole, user?.id]);

  const fetchMyAssignments = useCallback(async () => {
    if (appRole !== 'therapist' && appRole !== 'teacher') return;
    const { data } = await supabase
      .from('teacher_program_assignments')
      .select('*, programs(*)')
      .eq('teacher_id', user?.id)
      .eq('is_active', true);
    if (data) setMyAssignments(data);
  }, [appRole, user?.id]);

  const {
    addStaffAvailability,
    removeStaffAvailability,
    smartSchedule,
  } = createSchedulingActions({
    studentPrograms,
    students,
    staff,
    rooms,
    programs,
    sessions,
    studentAvailability,
    schedulingSettings,
    setSessions,
    setStudentPrograms,
    setStaffAvailabilityState,
    notify,
  });

  const value = {
    staff,
    students,
    rooms,
    sessions,
    programs,
    studentPrograms,
    studentAvailability,
    staffAvailability,
    schedulingSettings,
    conflicts,
    user,
    appRole,
    parentChildren,
    myAssignments,
    notifications,
    changePassword,
    isAdmin,
    isSuperAdmin,
    isParent,
    isTeacher,
    isTherapist,
    isTherapistOrTeacher,
    darkMode,
    setDarkMode,
    login,
    adminCreateUser,
    adminDeleteUser,
    logout,
    smartSchedule,
    addSession,
    moveSession,
    deleteSession,
    addPerson,
    addRoom,
    addSessionNote,
    markAttendance,
    fetchAttendance,
    fetchParentChildren,
    fetchMyAssignments,
    assignParentToStudent,
    updateUserRole,
    toggleUserActive,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    addStaffAvailability,
    removeStaffAvailability,
    toast,
    notify,
    loading,
    clearDatabase
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
};
