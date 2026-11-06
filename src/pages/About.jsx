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
  'Administration pages for identity, audit, runtime configuration and system health.',
  'Notifications for the people affected by a scheduling or record change.',
];

const ROLES = [
  {
    id: 'superadmin',
    name: 'IT Manager',
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
  <div className="itx-scope min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
    <header className="border-b border-[var(--line-subtle)] bg-[var(--surface)]">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* crown-only crop: the lockup's wordmark sits below the crop line */}
          <div className="h-10 w-10 shrink-0 overflow-hidden flex items-start justify-center">
            <img
              src="/brand/polikids-logo-removebg-preview.png"
              alt="Polikids crown"
              width={500}
              height={499}
              className="h-20 w-20 max-w-none shrink-0 dark:invert"
            />
          </div>
          <p className="sa-wordmark">PoliSync</p>
        </div>
        <nav aria-label="Public pages" className="flex items-center gap-4">
          <Link to="/login" className="sa-link min-h-[44px]">
            <ArrowLeft size={14} strokeWidth={1.5} /> Back to Login
          </Link>
          <Link to="/faq" className="sa-link min-h-[44px]">
            FAQ
          </Link>
        </nav>
      </div>
    </header>

    <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 lg:space-y-8">
      <section className="space-y-2 pb-4 border-b border-[var(--line-subtle)]">
        <h1>About PoliSync</h1>
        <p>
          PoliSync is scheduling and case-management software for special-education and therapy centers.
          It keeps students, programs, staff, rooms and sessions in one place, and gives every role a
          dashboard that shows only what that role is allowed to work with.
        </p>
      </section>

      <section className="sa-panel space-y-4">
        <h2 className="sa-panel-title">What it does</h2>
        <ul className="space-y-2">
          {FEATURES.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-[var(--ink-body)] leading-relaxed">
              <Check size={16} strokeWidth={1.5} className="shrink-0 mt-0.5 text-[var(--ink-muted)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="sa-panel-title">Who uses it</h2>
        <p className="text-sm text-[var(--ink-body)]">
          Five roles share the system. Accounts are created by an administrator — there is no public sign-up.
        </p>
        <ul className="grid gap-4 md:grid-cols-2">
          {ROLES.map((role) => (
            <li key={role.id} className="sa-panel space-y-3">
              <div className="flex items-center gap-3">
                <role.icon size={16} strokeWidth={1.5} className="shrink-0 text-[var(--ink-muted)]" />
                <div className="min-w-0">
                  <h3 className="sa-row-title">{role.name}</h3>
                  <p className="sa-micro">{role.who}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {role.can.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-[var(--ink-body)]">
                    <Check size={14} strokeWidth={1.5} className="shrink-0 mt-0.5 text-[var(--ink-muted)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="sa-panel space-y-4">
        <h2 className="sa-panel-title">Technology</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TECH.map((item) => (
            <li key={item.name} className="flex items-baseline gap-2 text-sm">
              <span className="text-[var(--ink-primary)]">{item.name}</span>
              <span className="text-[var(--ink-muted)]">{item.what}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="sa-panel space-y-2">
        <h2 className="sa-panel-title">Developed By</h2>
        {/* TODO: replace with real capstone details — team name, course, institution */}
        <p className="text-sm text-[var(--ink-body)]">Capstone Project — details to be confirmed.</p>
      </section>

      <footer className="pt-2 flex flex-wrap items-center gap-4">
        <Link to="/login" className="sa-link min-h-[44px]">
          <ArrowLeft size={14} strokeWidth={1.5} /> Back to Login
        </Link>
        <Link to="/faq" className="sa-link min-h-[44px]">Frequently Asked Questions</Link>
      </footer>
    </main>
  </div>
);

export default About;
