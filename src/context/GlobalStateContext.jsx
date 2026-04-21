import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const GlobalStateContext = createContext();

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) throw new Error('useGlobalState must be used within a GlobalStateProvider');
  return context;
};

// ─── Mock Data Generators ────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Anna', 'Mark', 'Sarah', 'Luis', 'Maria', 'Jose', 'Clara', 'Miguel', 'Rosa', 'Carlos',
  'Diana', 'Rafael', 'Teresa', 'Gabriel', 'Patricia', 'Antonio', 'Carmen', 'Francisco', 'Elena', 'Pedro',
  'Angela', 'Ricardo', 'Lucia', 'Fernando', 'Isabel', 'Manuel', 'Sofia', 'Andres', 'Victoria', 'Ramon',
  'Beatriz', 'Jorge', 'Lourdes', 'Eduardo', 'Grace', 'David', 'Christine', 'Bryan', 'Denise', 'Ryan',
  'Janelle', 'Kevin', 'Nicole', 'Aaron', 'Jessica', 'Troy', 'Bianca', 'Jasper', 'Kim', 'Nathan',
];

const LAST_NAMES = [
  'Roberts', 'Lee', 'Garcia', 'Santos', 'Cruz', 'Reyes', 'Mendoza', 'Torres', 'Ramos', 'Flores',
  'Dela Cruz', 'Bautista', 'Gonzales', 'Aquino', 'Villanueva', 'Fernandez', 'Castro', 'Rivera', 'Lopez', 'Diaz',
  'Morales', 'Navarro', 'Salazar', 'Perez', 'Gutierrez', 'Jimenez', 'Herrera', 'Aguilar', 'Medina', 'Pascual',
  'Soriano', 'Manalo', 'Enriquez', 'Lim', 'Tan', 'Chua', 'Valdez', 'Miranda', 'Rosario', 'Santiago',
  'Domingo', 'Mercado', 'Padilla', 'Ocampo', 'Nicolas', 'Magno', 'Corpuz', 'Tolentino', 'Pangan', 'David',
];

const STAFF_ROLES = [
  { role: 'Occupational Therapist', dept: 'Rehab' },
  { role: 'Physiotherapist', dept: 'Rehab' },
  { role: 'Speech Therapist', dept: 'Rehab' },
  { role: 'Behavioral Therapist', dept: 'SPED' },
  { role: 'Lead Teacher', dept: 'Playschool' },
  { role: 'Teacher Aide', dept: 'Playschool' },
  { role: 'SPED Teacher', dept: 'SPED' },
  { role: 'Developmental Pediatrician', dept: 'Rehab' },
  { role: 'Psychologist', dept: 'SPED' },
  { role: 'Social Worker', dept: 'SPED' },
  { role: 'Program Coordinator', dept: 'Admin' },
  { role: 'Center Director', dept: 'Admin' },
  { role: 'Guidance Counselor', dept: 'SPED' },
  { role: 'Music Therapist', dept: 'Rehab' },
  { role: 'Art Therapist', dept: 'Rehab' },
];

const STUDENT_PROGRAMS = [
  { role: 'ASD Program', dept: 'SPED', diagnosis: 'Autism Spectrum Disorder' },
  { role: 'Speech Therapy', dept: 'Rehab', diagnosis: 'Speech Delay' },
  { role: 'ADHD Program', dept: 'SPED', diagnosis: 'Attention Deficit Hyperactivity Disorder' },
  { role: 'Sensory Integration', dept: 'Rehab', diagnosis: 'Sensory Processing Disorder' },
  { role: 'Early Intervention', dept: 'Playschool', diagnosis: 'Global Developmental Delay' },
  { role: 'OT Program', dept: 'Rehab', diagnosis: 'Fine Motor Delay' },
  { role: 'PT Program', dept: 'Rehab', diagnosis: 'Gross Motor Delay' },
  { role: 'Behavioral Modification', dept: 'SPED', diagnosis: 'Oppositional Defiant Disorder' },
  { role: 'Learning Support', dept: 'SPED', diagnosis: 'Specific Learning Disability' },
  { role: 'Social Skills Training', dept: 'SPED', diagnosis: 'Social Communication Disorder' },
  { role: 'Play-Based Learning', dept: 'Playschool', diagnosis: 'Developmental Coordination Disorder' },
  { role: 'Language Development', dept: 'Rehab', diagnosis: 'Expressive Language Disorder' },
  { role: 'Cognitive Development', dept: 'SPED', diagnosis: 'Intellectual Disability' },
  { role: 'Feeding Therapy', dept: 'Rehab', diagnosis: 'Feeding Disorder' },
  { role: 'Inclusive Prep', dept: 'Playschool', diagnosis: 'Down Syndrome' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function seededName(index, usedNames) {
  // Generates a unique name by cycling through first/last name combos
  let fi = index % FIRST_NAMES.length;
  let li = Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length;
  let name = `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`;
  // If duplicate, shift last name
  while (usedNames.has(name)) {
    li = (li + 1) % LAST_NAMES.length;
    name = `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`;
  }
  usedNames.add(name);
  return name;
}

function generateStaff() {
  const usedNames = new Set();
  const result = [];

  // Keep admin as-is for login
  result.push({
    id: 0, name: "System Administrator", role: "Admin", department: "Admin",
    type: "Staff", status: "Active", email: "admin@polisync.com",
    password: "chris12345", phone: "+63 900 000 0000", joined: "Jan 2024"
  });
  usedNames.add("System Administrator");

  // Keep original staff for session references
  result.push({
    id: 1, name: "Anna Roberts", role: "Occupational Therapist", department: "Rehab",
    type: "Staff", status: "Active", email: "anna.r@polisync.com",
    phone: "+63 912 345 6701", joined: "Aug 2024"
  });
  usedNames.add("Anna Roberts");

  result.push({
    id: 2, name: "Mark Lee", role: "Physiotherapist", department: "Rehab",
    type: "Staff", status: "Active", email: "mark.l@polisync.com",
    phone: "+63 912 345 6702", joined: "Sep 2024"
  });
  usedNames.add("Mark Lee");

  result.push({
    id: 5, name: "Sarah Garcia", role: "Lead Teacher", department: "Playschool",
    type: "Staff", status: "Active", email: "sarah.g@polisync.com",
    phone: "+63 912 345 6705", joined: "Jan 2025"
  });
  usedNames.add("Sarah Garcia");

  // Generate remaining staff to reach 42 total
  for (let i = 4; i < 42; i++) {
    const actualId = 100 + i; // safe IDs starting from 100+
    const name = seededName(i + 10, usedNames);
    const roleInfo = STAFF_ROLES[i % STAFF_ROLES.length];
    const joinMonth = MONTHS[(i * 3) % 12];
    const joinYear = i < 20 ? 2024 : 2025;
    const firstName = name.split(' ')[0].toLowerCase();
    const lastInitial = name.split(' ')[1]?.[0]?.toLowerCase() || 'x';

    result.push({
      id: actualId,
      name,
      role: roleInfo.role,
      department: roleInfo.dept,
      type: "Staff",
      status: i % 8 === 0 ? "On Leave" : "Active",
      email: `${firstName}.${lastInitial}@polisync.com`,
      phone: `+63 9${String(12 + (i % 8)).padStart(2, '0')} ${String(100 + i).padStart(3, '0')} ${String(6700 + i).padStart(4, '0')}`,
      joined: `${joinMonth} ${joinYear}`,
    });
  }

  return result;
}

function generateStudents() {
  const usedNames = new Set();
  const result = [];

  // Keep original students for session references
  result.push({
    id: 3, name: "Marco Santos", role: "ASD Program", department: "SPED",
    type: "Student", status: "Enrolled", email: "parent.santos@email.com",
    phone: "+63 917 111 0003", joined: "Oct 2024",
    diagnosis: "Autism Spectrum Disorder"
  });
  usedNames.add("Marco Santos");

  result.push({
    id: 4, name: "Elena Cruz", role: "Speech Therapy", department: "Rehab",
    type: "Student", status: "Enrolled", email: "parent.cruz@email.com",
    phone: "+63 917 111 0004", joined: "Nov 2024",
    diagnosis: "Speech Delay"
  });
  usedNames.add("Elena Cruz");

  // Generate remaining students to reach 257 total
  for (let i = 2; i < 257; i++) {
    const studentId = 1000 + i; // safe IDs starting from 1000+
    const name = seededName(i + 60, usedNames);  // offset to avoid staff names
    const progInfo = STUDENT_PROGRAMS[i % STUDENT_PROGRAMS.length];
    const joinMonth = MONTHS[(i * 2) % 12];
    const joinYear = i < 100 ? 2024 : (i < 200 ? 2025 : 2026);
    const lastName = name.split(' ').pop().toLowerCase().replace(/\s/g, '');

    result.push({
      id: studentId,
      name,
      role: progInfo.role,
      department: progInfo.dept,
      type: "Student",
      status: i % 12 === 0 ? "Inactive" : "Enrolled",
      email: `parent.${lastName}${i}@email.com`,
      phone: `+63 917 ${String(200 + (i % 800)).padStart(3, '0')} ${String(1000 + i).padStart(4, '0')}`,
      joined: `${joinMonth} ${joinYear}`,
      diagnosis: progInfo.diagnosis,
    });
  }

  return result;
}

function generateSessions(staffList, studentList) {
  const sessions = [
    // Keep original 4 sessions
    { id: 1, title: "SPED Group A", therapistId: 5, studentIds: [3], room: "Room 1", startHour: 8, span: 2, type: "sped" },
    { id: 2, title: "OT Individual", therapistId: 1, studentIds: [3], room: "Sensory Room", startHour: 10, span: 1, type: "rehab" },
    { id: 3, title: "PT Individual", therapistId: 2, studentIds: [4], room: "Room 2", startHour: 10, span: 1, type: "rehab" },
    { id: 4, title: "Playschool Morning", therapistId: 5, studentIds: [1002, 1003, 1004], room: "Play Area", startHour: 9, span: 3, type: "playschool" },
  ];

  // Generate additional sessions across rooms
  const sessionTemplates = [
    { title: "SPED Group B", type: "sped", span: 2 },
    { title: "Speech Therapy Block", type: "rehab", span: 1 },
    { title: "Sensory Integration", type: "rehab", span: 1 },
    { title: "Behavioral Session", type: "sped", span: 2 },
    { title: "Early Intervention AM", type: "playschool", span: 2 },
    { title: "OT Group Session", type: "rehab", span: 1 },
    { title: "Fine Motor Workshop", type: "rehab", span: 1 },
    { title: "Social Skills Circle", type: "sped", span: 2 },
    { title: "Music Therapy", type: "rehab", span: 1 },
    { title: "Play-Based Learning", type: "playschool", span: 2 },
    { title: "Language Development", type: "rehab", span: 1 },
    { title: "Cognitive Training", type: "sped", span: 1 },
    { title: "Afternoon Play Group", type: "playschool", span: 2 },
    { title: "Feeding Therapy", type: "rehab", span: 1 },
    { title: "ASD Support Group", type: "sped", span: 2 },
    { title: "ADHD Focus Session", type: "sped", span: 1 },
    { title: "PT Group Session", type: "rehab", span: 1 },
    { title: "Art Therapy", type: "rehab", span: 1 },
    { title: "Inclusive Prep Class", type: "playschool", span: 3 },
    { title: "Parent-Child Session", type: "sped", span: 1 },
  ];

  const therapistIds = staffList.filter(s => s.role !== 'Admin' && s.role !== 'Program Coordinator' && s.role !== 'Center Director').map(s => s.id);

  for (let i = 0; i < sessionTemplates.length; i++) {
    const tpl = sessionTemplates[i];
    const roomNum = (i % 22) + 1; // cycle through rooms 1-22
    const roomName = roomNum <= 25 ? `Room ${roomNum}` : `Room ${roomNum % 25 + 1}`;
    const startHour = 8 + (i % 9); // 8am to 4pm start
    const therapistId = therapistIds[i % therapistIds.length];

    // Assign 1-4 students per session
    const numStudents = 1 + (i % 4);
    const studentStartIdx = (i * 3) % (studentList.length - numStudents);
    const studentIds = studentList.slice(studentStartIdx, studentStartIdx + numStudents).map(s => s.id);

    // Make sure session doesn't extend past 5pm
    const safeSpan = Math.min(tpl.span, 17 - startHour);
    if (safeSpan <= 0) continue;

    sessions.push({
      id: 100 + i,
      title: tpl.title,
      therapistId,
      studentIds,
      room: roomName,
      startHour,
      span: safeSpan,
      type: tpl.type,
    });
  }

  return sessions;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const GlobalStateProvider = ({ children }) => {
  // --- MOCK DATA INITIALIZATION ---
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [sessions, setSessions] = useState([]);
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
            type: s.type
          })));
        }

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
    conflicts,
    user,
    darkMode,
    setDarkMode,
    login,
    signup,
    logout,
    deleteAccount,
    findAvailableGaps,
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
    seedDatabase: async () => {
      setLoading(true);
      try {
        // Seed Rooms
        const roomsToSeed = Array.from({ length: 25 }).map((_, i) => ({
          name: `Room ${i + 1}`,
          type: i < 10 ? "General SPED" : i < 18 ? "Therapy Room" : "Playschool Area",
          max_capacity: 7,
        }));
        await supabase.from('rooms').insert(roomsToSeed);

        // Seed Staff
        const staffToSeed = generateStaff().map(s => ({
          name: s.name,
          role: s.role,
          department: s.department,
          type: s.type,
          status: s.status,
          email: s.email,
          phone: s.phone,
          joined: s.joined
        }));
        
        await supabase.from('profiles').insert(staffToSeed);

        // Seed Students
        const studentsToSeed = generateStudents().map(s => ({
          name: s.name,
          role: s.role,
          department: s.department,
          type: s.type,
          status: s.status,
          email: s.email,
          phone: s.phone,
          joined: s.joined,
          diagnosis: s.diagnosis
        }));
        await supabase.from('students').insert(studentsToSeed);

        // Fetch everything back to sync
        window.location.reload(); 
      } catch (error) {
        console.error('Error seeding database:', error);
      } finally {
        setLoading(false);
      }
    },
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
