import { useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { HiOutlineHome, HiOutlinePhotograph, HiOutlineFolder, HiOutlineArrowLeft } from 'react-icons/hi';
import { useAuth } from '../hooks/useAuth';

const AMBER = '#f59e0b';

/* ── Частицы на фоне (как в AuthScreen/Hero) ── */
function AdminParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;

    const particles: {
      x: number; y: number; size: number; speedX: number; speedY: number;
      opacity: number; pulse: number;
    }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = Math.min(40, Math.floor((canvas.width * canvas.height) / 20000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: (Math.random() - 0.5) * 0.6,
        opacity: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX; p.y += p.speedY; p.pulse += 0.02;
        p.opacity = 0.1 + Math.sin(p.pulse) * 0.2;
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${p.opacity})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${p.opacity * 0.15})`; ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />;
}

/* ── Сайдбар навигации ── */
function AdminSidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { path: '/admin/categories', label: 'Категории', icon: HiOutlineFolder },
    { path: '/admin/photos', label: 'Фото', icon: HiOutlinePhotograph },
  ];

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-full w-64 bg-primary/95 backdrop-blur-md border-r border-[var(--color-border)] z-40 flex flex-col"
    >
      {/* Лого */}
      <div className="flex items-center gap-3 p-6 border-b border-[var(--color-border)]">
        <span style={{ color: AMBER, fontSize: '1.5rem' }}>⚡</span>
        <span className="font-bold text-lg text-on-surface">Админка</span>
      </div>

      {/* Навигация */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'text-on-muted hover:text-on-surface hover:bg-surface'}
              `}
            >
              <item.icon className="text-xl" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Выход */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-on-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <HiOutlineArrowLeft className="text-xl" />
          Выйти
        </button>
      </div>
    </motion.aside>
  );
}

/* ── Хэдер ── */
function AdminHeader() {
  const location = useLocation();

  return (
    <motion.header
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-64 right-0 h-16 bg-primary/95 backdrop-blur-md border-b border-[var(--color-border)] z-30 flex items-center px-6"
    >
      <h1 className="text-xl font-bold text-on-surface">
        {location.pathname === '/admin/categories' && 'Управление категориями'}
        {location.pathname === '/admin/photos' && 'Управление фото'}
      </h1>
    </motion.header>
  );
}

interface AdminLayoutProps {
  children?: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-primary">
      {/* Частицы на фоне */}
      <AdminParticles />

      {/* Радиальное свечение */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 1 }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80vmax',
          height: '80vmax',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${AMBER}20 0%, ${AMBER}08 30%, transparent 55%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <AdminSidebar />
      <AdminHeader />

      {/* Контент */}
      <main className="pt-16 pl-64 pr-6 pb-6 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}