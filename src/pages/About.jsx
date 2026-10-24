import { Link } from 'react-router-dom';
import {
  Stethoscope,
  ArrowLeft,
  ShieldCheck,
  CalendarDays,
  Users,
  DoorOpen,
  FileText,
  HeartHandshake,
  Check,
} from 'lucide-react';

const FEATURES = [
  'Student records and program enrolment, linked to the staff who deliver each program.',
  'A weekly schedule that assigns staff, rooms and time slots, with automatic conflict detection.',
  'Session notes written by therapists from their own dashboard.',
  'A System Console for account management, with an audit log of the changes made.',
  'Notifications for the people affected by a scheduling or record change.',
];

const ROLES = [
  {
    id: 'superadmin',
    name: 'Super Administrator',
    who: 'Owns the system',
    icon: ShieldCheck,
    can: [
      'Create, deactivate and delete user accounts',
      'Change any user’s role',
      'Review the audit log of system activity',
    ],
  },
  {
    id: 'admin',
    name: 'Administrator',
    who: 'Runs the center day to day',
    icon: CalendarDays,
    can: [
      'Build the schedule and run the auto-scheduler',
      'Keep student and staff records in the Directory',
      'Manage rooms and their capacity',
    ],
  },
  {
    id: 'teacher',
    name: 'Teacher',
    who: 'Delivers classroom sessions',
    icon: Users,
    can: [
      'See the programs and classroom sessions they are assigned to',
      'Mark attendance for their sessions',
    ],
  },
  {
    id: 'therapist',
    name: 'Therapist',
    who: 'Delivers therapy sessions',
    icon: Stethoscope,
    can: [
      'See their daily schedule and the students on it',
      'Write session notes for each session',
    ],
  },
  {
    id: 'parent',
    name: 'Parent',
    who: 'Follows their own child',
    icon: HeartHandshake,
    can: [
      'See their child’s weekly schedule',
      'Track program progress and notifications',
    ],
  },
];

const TECH = [
  { name: 'React 19', what: 'Interface' },
  { name: 'Vite 8', what: 'Build tool' },
  { name: 'Tailwind CSS 4', what: 'Styling' },
  { name: 'Supabase', what: 'Postgres, Auth, Realtime, Edge Functions' },
  { name: 'React Router 7', what: 'Navigation' },
  { name: 'Framer Motion', what: 'Transitions' },
];

const About = () => (
  <div className="min-h-screen bg-ps-bg font-sans text-ps-ink-1">
    <header className="bg-ps-surface border-b border-ps-border">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-ps-primary text-white flex items-center justify-center shrink-0">
            <Stethoscope size={18} />
          </div>
          <span className="font-display font-semibold text-base">PoliSync</span>
        </div>
        <nav aria-label="Public pages" className="flex items-center gap-4 text-sm font-medium">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-ps-ink-2 hover:text-ps-accent">
            <ArrowLeft size={16} /> Back to Login
          </Link>
          <Link to="/faq" className="text-ps-accent hover:underline">
            FAQ
          </Link>
        </nav>
      </div>
    </header>

    <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 lg:space-y-8">
      <section className="space-y-3">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">About PoliSync</h1>
        <p className="text-sm sm:text-base text-ps-ink-2 leading-relaxed">
          PoliSync is scheduling and case-management software for special-education and therapy centers.
          It keeps students, programs, staff, rooms and sessions in one place, and gives every role a
          dashboard that shows only what that role is allowed to work with.
        </p>
      </section>

      <section className="bg-ps-surface border border-ps-border rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">What it does</h2>
        <ul className="space-y-2.5">
          {FEATURES.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-ps-ink-2 leading-relaxed">
              <Check size={16} className="text-ps-success shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Who uses it</h2>
        <p className="text-sm text-ps-ink-2">
          Five roles share the system. Accounts are created by an administrator — there is no public sign-up.
        </p>
        <ul className="grid gap-4 md:grid-cols-2">
          {ROLES.map((role) => (
            <li key={role.id} className="bg-ps-surface border border-ps-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-ps-accent-soft text-ps-accent flex items-center justify-center shrink-0">
                  <role.icon size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ps-ink-1">{role.name}</h3>
                  <p className="text-xs text-ps-ink-2">{role.who}</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {role.can.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-ps-ink-2">
                    <Check size={14} className="text-ps-success shrink-0 mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-ps-surface border border-ps-border rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Technology</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TECH.map((item) => (
            <li key={item.name} className="flex items-baseline gap-2 text-sm">
              <span className="font-semibold text-ps-ink-1">{item.name}</span>
              <span className="text-ps-ink-2">{item.what}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-ps-surface border border-ps-border rounded-2xl p-5 sm:p-6 space-y-2">
        <h2 className="font-display text-lg font-semibold">Developed By</h2>
        {/* TODO: replace with real capstone details — team name, course, institution */}
        <p className="text-sm text-ps-ink-2">Capstone Project — details to be confirmed.</p>
      </section>

      <footer className="pt-2 flex flex-wrap items-center gap-4 text-sm text-ps-ink-2">
        <Link to="/login" className="inline-flex items-center gap-1.5 hover:text-ps-accent">
          <ArrowLeft size={16} /> Back to Login
        </Link>
        <Link to="/faq" className="hover:text-ps-accent">Frequently Asked Questions</Link>
      </footer>
    </main>
  </div>
);

export default About;
