import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, CalendarDays, GraduationCap, Stethoscope, HeartHandshake, ArrowRight } from 'lucide-react';
import AuthShell from './AuthShell';
import { AUTH_ROLES } from './roles';

const ROLE_ICONS = {
  superadmin: ShieldCheck,
  admin: CalendarDays,
  teacher: GraduationCap,
  therapist: Stethoscope,
  parent: HeartHandshake,
};

const RolePicker = () => {
  const navigate = useNavigate();

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/95 dark:bg-ps-surface/95 backdrop-blur rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 my-auto"
      >
        <div className="flex flex-col items-start space-y-2">
          <h2 className="font-display font-semibold text-3xl text-ps-ink-1">Sign in to PoliSync</h2>
          <p className="text-ps-ink-2 text-sm">Choose the account type you use.</p>
        </div>

        <nav aria-label="Account types" className="space-y-2">
          {AUTH_ROLES.map((role) => {
            const Icon = ROLE_ICONS[role.id];
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => navigate(`/login/${role.id}`)}
                className="w-full flex items-center gap-3 min-h-[44px] p-3 rounded-xl border border-ps-border bg-ps-bg hover:bg-ps-accent-soft text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent"
              >
                <span className="p-2 rounded-lg bg-ps-surface text-ps-ink-1 shrink-0">
                  <Icon size={18} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-ps-ink-1">{role.label}</span>
                  <span className="block text-xs text-ps-ink-2">{role.hint}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-ps-ink-2" />
              </button>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-ps-border flex flex-col items-center gap-3 text-xs text-ps-ink-2 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-ps-success" />
            <span>Secure access • Role-based • SPED Center</span>
          </div>
          <nav aria-label="About PoliSync" className="flex items-center gap-4">
            <Link to="/about" className="inline-flex items-center min-h-[44px] cursor-pointer hover:text-ps-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent">About this system</Link>
            <Link to="/faq" className="inline-flex items-center min-h-[44px] cursor-pointer hover:text-ps-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent">FAQ</Link>
          </nav>
        </div>
      </motion.div>
    </AuthShell>
  );
};

export default RolePicker;
