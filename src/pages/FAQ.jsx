import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
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
    a: 'Five roles share the system: IT managers, administrators, teachers, therapists and parents. Accounts are created by an administrator — the sign-up route redirects to the login page, so there is no public registration.',
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
    a: 'You land on your dashboard. The sidebar lists only the pages your role can open — administrators get Schedule, Directory and Rooms, therapists get Session Notes, IT managers get Identity & Access, Audit Trail, System Config and System Health, and every role has its own profile page and settings.',
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
    a: 'Your center’s administrator or IT Manager. They manage accounts from Identity & Access: creating users, changing roles, deactivating or deleting accounts, and reviewing the audit trail.',
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
            <Link to="/about" className="sa-link min-h-[44px]">
              About
            </Link>
          </nav>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 lg:space-y-8">
        <section className="space-y-2 pb-4 border-b border-[var(--line-subtle)]">
          <h1>Frequently Asked Questions</h1>
          <p>
            Short answers to the questions new users ask most. For anything specific to your own account,
            contact your center’s administrator.
          </p>
        </section>

        <ul className="space-y-2">
          {FAQS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <li key={item.id}>
                <div className="itx-card">
                  <div className="p-2">
                    <h2 className="text-sm">
                      <button
                        type="button"
                        id={`faq-button-${item.id}`}
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${item.id}`}
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        className={clsx(
                          'w-full flex items-start justify-between gap-4 text-left px-4 py-3 text-[var(--ink-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-sunken)]',
                          isOpen && 'bg-[var(--surface-hover)]'
                        )}
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          size={16}
                          strokeWidth={1.5}
                          className={clsx(
                            'shrink-0 mt-0.5 transition-transform',
                            isOpen ? 'rotate-180 text-[var(--ink-primary)]' : 'text-[var(--ink-muted)]'
                          )}
                        />
                      </button>
                    </h2>
                  </div>
                  <div
                    id={`faq-panel-${item.id}`}
                    role="region"
                    aria-labelledby={`faq-button-${item.id}`}
                    hidden={!isOpen}
                    className="px-6 pb-4 sm:px-7 text-sm text-[var(--ink-body)] leading-relaxed"
                  >
                    {item.a}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <footer className="pt-2 flex flex-wrap items-center gap-4">
          <Link to="/login" className="sa-link min-h-[44px]">
            <ArrowLeft size={14} strokeWidth={1.5} /> Back to Login
          </Link>
          <Link to="/about" className="sa-link min-h-[44px]">About PoliSync</Link>
        </footer>
      </main>
    </div>
  );
};

export default FAQ;
