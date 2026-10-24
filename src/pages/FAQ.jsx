import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowLeft, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

const FAQS = [
  {
    id: 'what-is-polisync',
    q: 'What is PoliSync?',
    a: 'PoliSync is scheduling and case-management software for special-education and therapy centers. It holds student records and program enrolment, assigns staff and rooms to sessions, and gives each user a dashboard for their role.',
  },
  {
    id: 'who-can-use',
    q: 'Who can use PoliSync?',
    a: 'Five roles share the system: super administrators, administrators, teachers, therapists and parents. Accounts are created by an administrator — the sign-up route redirects to the login page, so there is no public registration.',
  },
  {
    id: 'how-do-i-log-in',
    q: 'How do I log in?',
    a: 'Open the login page and enter the email address and password your center gave you. You are then taken to the dashboard for your role. If you do not have an account yet, ask your center’s administrator to create one.',
  },
  {
    id: 'forgot-password',
    q: 'I forgot my password. What do I do?',
    a: 'PoliSync has no self-service password reset, so contact your center’s administrator. The login form also locks temporarily after five failed attempts, so it is quicker to ask than to keep guessing.',
  },
  {
    id: 'after-login',
    q: 'What happens after I log in?',
    a: 'You land on your dashboard. The sidebar lists only the pages your role can open — administrators get Schedule, Directory and Rooms, therapists get Session Notes, super administrators get the System Console, and every role has its own profile page and settings.',
  },
  {
    id: 'change-own-password',
    q: 'Can I change my own password?',
    a: 'Not from a general settings screen. PoliSync asks you to set a new password when your account was created with a temporary password, and it must be at least 8 characters with one uppercase letter and one number. Any other password change has to go through your center’s administrator.',
  },
  {
    id: 'auto-scheduler',
    q: 'What is the Auto-Scheduler?',
    a: 'It is an administrator tool on the Schedule page. It reads the day’s pending student programs along with staff, room and student availability, proposes sessions with a time, room and staff member, and flags conflicts. It runs as a Supabase Edge Function, with the same logic falling back to the browser if that function is unavailable. The sessions it creates are unconfirmed, so the administrator can review them.',
  },
  {
    id: 'account-issues',
    q: 'Who do I contact for account issues?',
    a: 'Your center’s administrator or super administrator. They manage accounts from the System Console: creating users, changing roles, deactivating or deleting accounts, and reviewing the audit log.',
  },
  {
    id: 'data-security',
    q: 'Is my data secure?',
    a: 'Your signed-in session is kept in the browser’s sessionStorage, so it is cleared when the browser closes and each new tab starts signed out. Access to data is enforced by Supabase row-level security and by the role-based route guards in the app, so a role can only reach the pages and records it is allowed to see. The deployed site also sends a strict Content-Security-Policy and related security headers.',
  },
  {
    id: 'supported-browsers',
    q: 'What browsers are supported?',
    a: 'Recent versions of Chrome, Edge, Firefox and Safari, with JavaScript enabled. PoliSync is a single-page app that uses modern browser features such as ES modules and sessionStorage, so it is not supported on Internet Explorer.',
  },
];

const FAQ = () => {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="min-h-screen bg-ps-bg font-sans text-ps-ink-1">
      <header className="bg-ps-surface border-b border-ps-border">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-ps-accent text-white flex items-center justify-center shrink-0">
              <Stethoscope size={18} />
            </div>
            <span className="font-display font-semibold text-base">PoliSync</span>
          </div>
          <nav aria-label="Public pages" className="flex items-center gap-4 text-sm font-medium">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-ps-ink-2 hover:text-ps-accent">
              <ArrowLeft size={16} /> Back to Login
            </Link>
            <Link to="/about" className="text-ps-accent hover:underline">
              About
            </Link>
          </nav>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 lg:space-y-8">
        <section className="space-y-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Frequently Asked Questions</h1>
          <p className="text-sm sm:text-base text-ps-ink-2 leading-relaxed">
            Short answers to the questions new users ask most. For anything specific to your own account,
            contact your center’s administrator.
          </p>
        </section>

        <ul className="space-y-3">
          {FAQS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <li key={item.id} className="bg-ps-surface border border-ps-border rounded-2xl">
                <h2 className="font-display text-sm sm:text-base font-semibold text-ps-ink-1">
                  <button
                    type="button"
                    id={`faq-button-${item.id}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${item.id}`}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="w-full flex items-start justify-between gap-4 text-left p-4 sm:p-5 rounded-2xl hover:bg-ps-bg focus-visible:outline-2 focus-visible:outline-ps-accent"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={clsx('shrink-0 text-ps-ink-2 mt-0.5 transition-transform', isOpen && 'rotate-180')}
                    />
                  </button>
                </h2>
                <div
                  id={`faq-panel-${item.id}`}
                  role="region"
                  aria-labelledby={`faq-button-${item.id}`}
                  hidden={!isOpen}
                  className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-ps-ink-2 leading-relaxed"
                >
                  {item.a}
                </div>
              </li>
            );
          })}
        </ul>

        <footer className="pt-2 flex flex-wrap items-center gap-4 text-sm text-ps-ink-2">
          <Link to="/login" className="inline-flex items-center gap-1.5 hover:text-ps-accent">
            <ArrowLeft size={16} /> Back to Login
          </Link>
          <Link to="/about" className="hover:text-ps-accent">About PoliSync</Link>
        </footer>
      </main>
    </div>
  );
};

export default FAQ;
