import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { invokeSmartScheduler, localSmartSchedule } from '../lib/scheduler';

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
  // --- MOCK DATA INITIALIZATION ---
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [studentPrograms, setStudentPrograms] = useState([]);
  const [studentAvailability, setStudentAvailability] = useState([]);
  const [schedulingSettings, setSchedulingSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // --- SUPABASE INTEGRATION ---

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        // 1. Fetch Auth Session first so RouteGuards don't prematurely redirect
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Fetch profile and role concurrently
          const [profileRes, roleRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            supabase.from('user_roles').select('role').eq('user_id', session.user.id).single()
          ]);
          
          if (mounted) {
            const finalRole = roleRes.data?.role || profileRes.data?.app_role || 'teacher';
            if (profileRes.data) setUser({ ...profileRes.data, app_role: finalRole });
            setAppRole(finalRole);
          }
          
          supabase.from('notifications')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              if (mounted && data) setNotifications(data);
            });
        }
        
        // 2. Fetch all other data
        // Fetch Rooms
        const { data: roomsData } = await supabase.from('rooms').select('*');
        if (roomsData && mounted) setRooms(roomsData.map(r => ({ ...r, maxCapacity: r.max_capacity })));

        // Fetch Staff
        const { data: staffData } = await supabase.from('profiles').select('*');
        if (staffData && mounted) setStaff(staffData);

        // Fetch Students
        const { data: studentsData } = await supabase.from('students').select('*');
        if (studentsData && mounted) setStudents(studentsData);

        // Fetch Sessions
        const { data: sessionsData } = await supabase.from('sessions').select('*');
        if (sessionsData && mounted) {
          setSessions(sessionsData.map(s => ({
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
            isConfirmed: s.is_confirmed
          })));
        }

        // Fetch Programs
        const { data: programsData } = await supabase.from('programs').select('*').eq('is_active', true);
        if (programsData && mounted) setPrograms(programsData.map(p => ({ ...p, id: Number(p.id) })));

        // Fetch Student Programs
        const { data: spData } = await supabase.from('student_programs').select('*');
        if (spData && mounted) setStudentPrograms(spData.map(sp => ({ ...sp, student_id: Number(sp.student_id), program_id: Number(sp.program_id) })));

        // Fetch Student Availability
        const { data: saData } = await supabase.from('student_availability').select('*').eq('is_active', true);
        if (saData && mounted) setStudentAvailability(saData.map(sa => ({ ...sa, student_id: Number(sa.student_id) })));

        // Fetch Scheduling Settings
        const { data: settingsData } = await supabase.from('scheduling_settings').select('*').single();
        if (settingsData && mounted) setSchedulingSettings(settingsData);

      } catch (error) {
        console.error('Error fetching data during initialization:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeSession();

    if (!supabase) return;

    // Listen for ongoing auth changes (like login/logout from other tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null);
        setAppRole(null);
        setParentChildren([]);
        setMyAssignments([]);
        setNotifications([]);
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
              type: payload.new.type
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
            type: payload.new.type
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
      .subscribe();

    return () => {
      subscription.unsubscribe();
      channel.unsubscribe();
    };
  }, []);

  // --- DERIVED STATE / ACTIONS ---

  // Check for conflicts
  const conflicts = useMemo(() => {
    const list = [];
    sessions.forEach((s1, i) => {
      sessions.forEach((s2, j) => {
        if (i >= j) return;
        // Check time overlap
        const s1End = s1.startHour + s1.span;
        const s2End = s2.startHour + s2.span;
        const overlap = Math.max(s1.startHour, s2.startHour) < Math.min(s1End, s2End);

        if (overlap) {
          // Therapist conflict
          if (s1.therapistId === s2.therapistId) {
            list.push({ type: 'therapist', sessionIds: [s1.id, s2.id], therapistId: s1.therapistId, startHour: Math.max(s1.startHour, s2.startHour) });
          }
          // Room conflict
          if (s1.room === s2.room) {
            list.push({ type: 'room', sessionIds: [s1.id, s2.id], room: s1.room, startHour: Math.max(s1.startHour, s2.startHour) });
          }
        }
      });
    });
    return list;
  }, [sessions]);

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

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    let { data: profile } = await supabase.from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Auto-create profile if it doesn't exist yet (e.g. user created before migration)
    if (!profile) {
      const fallback = {
        id: data.user.id,
        name: data.user.email.split('@')[0],
        role: 'Staff',
        department: 'General',
        type: 'Staff',
        status: 'Active',
        email: data.user.email,
        app_role: 'teacher',
      };
      const { data: created } = await supabase.from('profiles').insert([fallback]).select().single();
      profile = created || fallback;

      // Also ensure a user_roles row exists
      await supabase.from('user_roles').insert([{ user_id: data.user.id, role: 'teacher' }]);
    }

    setUser(profile);

    const { data: roleData } = await supabase.from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .single();

    const finalRole = roleData?.role || profile.app_role || 'teacher';
    setAppRole(finalRole);
    setUser({ ...profile, app_role: finalRole });

    return { ...profile, app_role: finalRole };
  };

  /**
   * Admin-only: Create a new user account via the Edge Function.
   * The Edge Function uses the service_role key securely on the server.
   */
  const adminCreateUser = async (userData) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
          department: userData.department || 'General',
          phone: userData.phone || '',
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create user');

      notify(`User "${userData.name}" created successfully`, 'success');
      return data;
    } catch (error) {
      notify(error.message, 'error');
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAppRole(null);
    setParentChildren([]);
    setMyAssignments([]);
    setNotifications([]);
  };

  const isAdmin = () => appRole === 'admin';
  const isParent = () => appRole === 'parent';
  const isTeacher = () => appRole === 'teacher';
  const isTherapist = () => appRole === 'therapist';
  const isTherapistOrTeacher = () => appRole === 'therapist' || appRole === 'teacher';

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

  const addSessionNote = async (noteData) => {
    try {
      const { data, error } = await supabase.from('session_notes').insert([{
        session_id: noteData.sessionId,
        student_id: noteData.studentId,
        created_by: user?.id,
        note_type: noteData.noteType || 'general',
        content: noteData.content,
        rating: noteData.rating,
      }]).select();
      if (error) throw error;
      if (data) notify('Session note added');
      return data;
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const markAttendance = async (sessionId, studentId, status, notes) => {
    try {
      const { data, error } = await supabase.from('attendance').upsert([{
        session_id: sessionId,
        student_id: studentId,
        status,
        notes,
        marked_by: user?.id,
        marked_at: new Date().toISOString(),
      }]).select();
      if (error) throw error;
      if (data) notify('Attendance marked');
      return data;
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const fetchAttendance = async (sessionId) => {
    const { data } = await supabase
      .from('attendance')
      .select('*, students(*)')
      .eq('session_id', sessionId);
    return data || [];
  };

  const assignParentToStudent = async (parentId, studentId) => {
    try {
      const { error } = await supabase.from('parent_student_relationships').insert([{
        parent_id: parentId,
        student_id: studentId,
      }]);
      if (error) throw error;
      notify('Parent linked to student');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const assignTeacherToProgram = async (teacherId, programId) => {
    try {
      const { error } = await supabase.from('teacher_program_assignments').insert([{
        teacher_id: teacherId,
        program_id: programId,
      }]);
      if (error) throw error;
      notify('Teacher assigned to program');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const updateUserRole = async (targetUserId, newRole) => {
    try {
      const { error } = await supabase.from('user_roles').upsert([{
        user_id: targetUserId,
        role: newRole,
      }]);
      if (error) throw error;
      notify(`Role updated to ${newRole}`);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  /**
   * Admin-only: Toggle a user's is_active status.
   */
  const toggleUserActive = async (targetUserId, isActive) => {
    try {
      const { error } = await supabase.from('profiles')
        .update({ is_active: isActive })
        .eq('id', targetUserId);
      if (error) throw error;

      // Log to audit_logs
      await supabase.from('audit_logs').insert([{
        action: isActive ? 'user_activated' : 'user_deactivated',
        performed_by: user?.id,
        target_user_id: targetUserId,
        details: { is_active: isActive },
      }]);

      setStaff(prev => prev.map(s =>
        s.id === targetUserId ? { ...s, is_active: isActive } : s
      ));
      notify(isActive ? 'User activated' : 'User deactivated');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const createNotification = async (notifData) => {
    try {
      const { error } = await supabase.from('notifications').insert([{
        user_id: notifData.userId,
        title: notifData.title,
        message: notifData.message,
        type: notifData.type || 'info',
        related_id: notifData.relatedId,
      }]);
      if (error) throw error;
    } catch (error) {
      console.error('Notification error:', error);
    }
  };

  const deleteAccount = (userId) => {
    setStaff(prev => prev.filter(s => s.id !== userId));
    setUser(null);
  };

  const addRoom = async (room) => {
    try {
      const { data, error } = await supabase.from('rooms').insert([{
        name: room.name,
        type: room.type,
        max_capacity: room.maxCapacity || 5
      }]).select();
      if (error) throw error;
      if (data) {
        setRooms(prev => [...prev, { ...data[0], maxCapacity: data[0].max_capacity }]);
        notify(`Room "${room.name}" added successfully`);
      }
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const updateRoom = async (id, updates) => {
    try {
      const dbUpdates = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.type) dbUpdates.type = updates.type;
      if (updates.maxCapacity) dbUpdates.max_capacity = updates.maxCapacity;

      const { error } = await supabase.from('rooms').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setRooms(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      notify('Room updated successfully');
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const deleteRoom = async (id) => {
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
      setRooms(prev => prev.filter(r => r.id !== id));
      notify('Room deleted');
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const addSession = async (session) => {
    try {
      const { data, error } = await supabase.from('sessions').insert([{
        title: session.title,
        therapist_id: session.therapistId,
        student_ids: session.studentIds || [],
        room: session.room,
        start_hour: session.startHour,
        span: session.span,
        type: session.type
      }]).select();

      if (error) throw error;
      if (data) {
        setSessions(prev => [...prev, {
          id: data[0].id,
          title: data[0].title,
          therapistId: data[0].therapist_id,
          studentIds: data[0].student_ids,
          room: data[0].room,
          startHour: data[0].start_hour,
          span: data[0].span,
          type: data[0].type
        }]);
        notify('Session scheduled successfully');
      }
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };
  
  const moveSession = async (sessionId, newStartHour, newRoom) => {
    try {
      const { error } = await supabase.from('sessions')
        .update({ start_hour: newStartHour, room: newRoom })
        .eq('id', sessionId);

      if (error) throw error;
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, startHour: newStartHour, room: newRoom || s.room } : s));
      notify('Session moved');
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      notify('Session cancelled');
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const findAvailableGaps = (therapistId, roomId, span = 1) => {
    const gaps = [];
    const operatingHours = Array.from({ length: 9 }, (_, i) => i + 8); // 8am to 5pm (start hours)

    operatingHours.forEach(hour => {
      if (hour + span > 17) return; // Beyond 5pm

      // Check therapist availability at this hour
      const therapistBusy = sessions.some(s => 
        String(s.therapistId) === String(therapistId) && 
        Math.max(s.startHour, hour) < Math.min(s.startHour + s.span, hour + span)
      );

      // Check room availability at this hour
      const roomBusy = sessions.some(s => 
        s.room === roomId && 
        Math.max(s.startHour, hour) < Math.min(s.startHour + s.span, hour + span)
      );

      if (!therapistBusy && !roomBusy) {
        gaps.push({ hour, room: roomId });
      }
    });
    return gaps;
  };

  const enhanceConflictDetection = (newSession) => {
    const list = [];
    const newStart = newSession.startHour;
    const newEnd = newSession.startHour + newSession.span;
    const newDay = newSession.dayOfWeek ?? 0;

    sessions.forEach(existing => {
      const existStart = existing.startHour;
      const existEnd = existing.startHour + existing.span;
      const existDay = existing.dayOfWeek ?? 0;

      // Same day and time overlap
      const timeOverlap = Math.max(newStart, existStart) < Math.min(newEnd, existEnd);
      const sameDay = newDay === existDay;

      if (timeOverlap && sameDay) {
        // Therapist conflict
        if (String(newSession.therapistId) === String(existing.therapistId)) {
          list.push({ type: 'therapist', sessionIds: [newSession.id, existing.id], message: 'Therapist already booked' });
        }
        // Room conflict
        if (newSession.room === existing.room) {
          list.push({ type: 'room', sessionIds: [newSession.id, existing.id], room: newSession.room, message: `Room "${existing.room}" occupied` });
        }
        // Student conflict
        if (newSession.studentIds?.some(id => existing.studentIds?.includes(id))) {
          list.push({ type: 'student', sessionIds: [newSession.id, existing.id], message: 'Student has conflicting session' });
        }
      }
    });

    // Check student availability constraints
    const maxDailyHours = schedulingSettings?.max_daily_hours_per_student || 4;

    newSession.studentIds?.forEach(studentId => {
      const studentSessions = sessions.filter(s => 
        s.studentIds?.includes(studentId) && s.dayOfWeek === newDay
      );
      const totalHours = studentSessions.reduce((sum, s) => sum + s.span, 0) + newSession.span;
      
      if (totalHours > maxDailyHours) {
        list.push({ type: 'student_limit', message: `Student exceeds daily ${maxDailyHours}h limit` });
      }
    });

    return list;
  };

  /**
   * Smart Schedule — calls the Edge Function for production-grade
   * backtracking + scoring, with a local fallback for offline/preview.
   */
  const smartSchedule = async (options = {}) => {
    const { dryRun = false, dayOfWeek, config: userConfig } = options;

    // Try Edge Function first (full backtracking + multi-attempt)
    if (supabase) {
      try {
        const result = await invokeSmartScheduler({ dayOfWeek, dryRun, config: userConfig });
        if (result.success) {
          // Refresh student programs state after scheduling
          if (!dryRun && result.scheduled?.length > 0) {
            const scheduledIds = result.scheduled.map(a => a.studentProgramId);
            setStudentPrograms(prev =>
              prev.map(p => scheduledIds.includes(p.id) ? { ...p, status: 'scheduled' } : p)
            );
            notify(`Smart scheduler: ${result.scheduled.length} sessions created (score: ${result.score})`);
          }
          return result;
        }
      } catch (err) {
        console.warn('Edge Function failed, falling back to local scheduler:', err);
      }
    }

    // Fallback: run local lightweight solver
    try {
      const result = localSmartSchedule({
        studentPrograms,
        students,
        staff,
        rooms,
        programs,
        sessions,
        studentAvailability,
        schedulingSettings,
        dayOfWeek,
      }, userConfig);

      // Persist locally-computed schedule if not dry run
      if (!dryRun && supabase && result.scheduled?.length > 0) {
        for (const a of result.scheduled) {
          const { data, error } = await supabase.from('sessions').insert({
            title: `Auto: ${a.programName}`,
            therapist_id: a.teacherId,
            student_ids: [a.studentId],
            room: a.room,
            start_hour: a.startHour,
            span: a.duration,
            type: a.type,
            program_id: a.programId,
            day_of_week: dayOfWeek ?? 0,
            is_confirmed: false,
          }).select().single();

          if (!error && data) {
            await supabase.from('student_programs').update({ status: 'scheduled' }).eq('id', a.studentProgramId);
          }
        }
        // Refresh state
        const scheduledIds = result.scheduled.map(a => a.studentProgramId);
        setStudentPrograms(prev =>
          prev.map(p => scheduledIds.includes(p.id) ? { ...p, status: 'scheduled' } : p)
        );
        notify(`Local scheduler: ${result.scheduled.length} sessions created (score: ${result.score})`);
      }

      return { success: true, ...result };
    } catch (error) {
      console.error('Local smart schedule error:', error);
      return { success: false, error: error.message };
    }
  };

  // Keep legacy name for backward compatibility
  const autoSchedule = smartSchedule;

  const addPerson = async (person) => {
    try {
      if (person.type === 'Staff') {
        const { data, error } = await supabase.from('profiles').insert([{
          name: person.name,
          role: person.role,
          department: person.department,
          type: person.type,
          status: person.status,
          email: person.email,
          phone: person.phone,
          joined: person.joined
        }]).select();
        if (error) throw error;
        if (data) {
          setStaff(prev => [...prev, data[0]]);
          notify(`${person.name} added to staff`);
        }
      } else {
        const { data, error } = await supabase.from('students').insert([{
          name: person.name,
          role: person.role,
          department: person.department,
          type: person.type,
          status: person.status,
          email: person.email,
          phone: person.phone,
          joined: person.joined,
          diagnosis: person.diagnosis || ''
        }]).select();
        if (error) throw error;
        if (data) {
          setStudents(prev => [...prev, data[0]]);
          notify(`${person.name} enrolled successfully`);
        }
      }
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const value = {
    staff,
    students,
    rooms,
    sessions,
    programs,
    studentPrograms,
    studentAvailability,
    schedulingSettings,
    conflicts,
    user,
    appRole,
    parentChildren,
    myAssignments,
    notifications,
    isAdmin,
    isParent,
    isTeacher,
    isTherapist,
    isTherapistOrTeacher,
    darkMode,
    setDarkMode,
    login,
    adminCreateUser,
    logout,
    deleteAccount,
    findAvailableGaps,
    enhanceConflictDetection,
    autoSchedule,
    smartSchedule,
    addSession,
    moveSession,
    deleteSession,
    addPerson,
    addRoom,
    updateRoom,
    deleteRoom,
    addSessionNote,
    markAttendance,
    fetchAttendance,
    fetchParentChildren,
    fetchMyAssignments,
    assignParentToStudent,
    assignTeacherToProgram,
    updateUserRole,
    toggleUserActive,
    createNotification,
    toast,
    notify,
    loading,
    clearDatabase: async () => {
      setLoading(true);
      try {
        // 1. Delete all sessions first (foreign keys)
        await supabase.from('sessions').delete().neq('id', -1);
        // 2. Delete all students
        await supabase.from('students').delete().neq('id', -1);
        // 3. Delete all rooms
        await supabase.from('rooms').delete().neq('id', -1);
        // 4. Delete all profiles except the current logged-in user
        if (user?.id) {
          await supabase.from('profiles').delete().neq('id', user.id);
        } else {
          await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }

        // Update local state
        setSessions([]);
        setStudents([]);
        setRooms([]);
        setStaff(user ? [user] : []);
        
        console.log('Database cleared successfully');
      } catch (error) {
        console.error('Error clearing database:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
};
