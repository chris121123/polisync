import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
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
    const fetchAllData = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch Rooms
        const { data: roomsData } = await supabase.from('rooms').select('*');
        if (roomsData) {
          setRooms(roomsData.map(r => ({
            ...r,
            maxCapacity: r.max_capacity
          })));
        }

        // Fetch Staff
        const { data: staffData } = await supabase.from('profiles').select('*');
        if (staffData) setStaff(staffData);

        // Fetch Students
        const { data: studentsData } = await supabase.from('students').select('*');
        if (studentsData) setStudents(studentsData);

        // Fetch Sessions
        const { data: sessionsData } = await supabase.from('sessions').select('*');
        if (sessionsData) {
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
        if (programsData) setPrograms(programsData.map(p => ({ ...p, id: Number(p.id) })));

        // Fetch Student Programs (requirements)
        const { data: spData } = await supabase.from('student_programs').select('*');
        if (spData) setStudentPrograms(spData.map(sp => ({ ...sp, student_id: Number(sp.student_id), program_id: Number(sp.program_id) })));

        // Fetch Student Availability
        const { data: saData } = await supabase.from('student_availability').select('*').eq('is_active', true);
        if (saData) setStudentAvailability(saData.map(sa => ({ ...sa, student_id: Number(sa.student_id) })));

        // Fetch Scheduling Settings
        const { data: settingsData } = await supabase.from('scheduling_settings').select('*').single();
        if (settingsData) setSchedulingSettings(settingsData);

      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

    if (!supabase) return;

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Fetch profile when logged in
        supabase.from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setUser(data);
          });
      } else {
        setUser(null);
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
    
    const { data: profile } = await supabase.from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    setUser(profile);
    return profile;
  };

  const signup = async (userData) => {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });

    if (error) {
      throw error;
    }

    const newUser = { 
      id: data.user.id,
      name: userData.name,
      role: userData.role || 'Staff',
      department: userData.department || 'General',
      type: 'Staff', 
      status: 'Active', 
      email: userData.email,
      phone: userData.phone,
      joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };

    const { error: profileError } = await supabase.from('profiles').insert([newUser]);
    if (profileError) console.error('Error creating profile:', profileError.message);
    
    setStaff(prev => [...prev, newUser]);
    setUser(newUser);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
    darkMode,
    setDarkMode,
    login,
    signup,
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
