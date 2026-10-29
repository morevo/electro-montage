import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineLightningBolt } from 'react-icons/hi'
import { FiLock, FiUser, FiZap } from 'react-icons/fi'

const AMBER = '#f59e0b'
const smooth = (delay: number) => ({
  duration: 0.7,
  delay,
  ease: [0.4, 0, 0.2, 1] as const,
})

/* ── Electric particles background (same style as Hero) ── */
function AuthParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animationId: number

    const particles: {
      x: number; y: number; size: number; speedX: number; speedY: number
      opacity: number; pulse: number
    }[] = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const count = Math.min(40, Math.floor((canvas.width * canvas.height) / 20000))
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: (Math.random() - 0.5) * 0.6,
        opacity: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.speedX; p.y += p.speedY; p.pulse += 0.02
        p.opacity = 0.1 + Math.sin(p.pulse) * 0.2
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1

        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245, 158, 11, ${p.opacity})`; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245, 158, 11, ${p.opacity * 0.15})`; ctx.fill()
      })

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(245, 158, 11, ${0.06 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(animate)
    }
    animate()
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
}

/* ── Spark burst on successful login ── */
function SparkBurst() {
  const sparks = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2
    const distance = 80 + Math.random() * 120
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      scale: 0.5 + Math.random() * 1,
      delay: Math.random() * 0.15,
    }
  })

  return (
    <>
      {sparks.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: s.x,
            y: s.y,
            scale: [0, s.scale, 0],
          }}
          transition={{ duration: 0.7, delay: s.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: AMBER,
            boxShadow: `0 0 8px ${AMBER}, 0 0 16px ${AMBER}88`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}

/* ── Electric arc SVG decoration ── */
function ElectricArc({ side }: { side: 'left' | 'right' }) {
  const flip = side === 'right' ? -1 : 1
  return (
    <motion.svg
      width="60" height="120" viewBox="0 0 60 120"
      className="absolute top-1/2 -translate-y-1/2"
      style={{ [side]: -30, transform: `translateY(-50%) scaleX(${flip})` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.2, 0.6, 0.2] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.path
        d="M30 0 L15 30 L35 35 L10 65 L40 60 L5 95 L45 80 L20 120"
        stroke={AMBER}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        filter="url(#arcGlow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: 'easeInOut' }}
      />
      <defs>
        <filter id="arcGlow">
          <feGaussianBlur stdDeviation="3" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </motion.svg>
  )
}

/* ── Main Auth Screen ── */
interface AuthScreenProps {
  onAuth: () => void
}

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [shake, setShake] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (username === 'admin' && password === 'admin') {
      setSuccess(true)
      setTimeout(() => onAuth(), 1200)
    } else {
      setError('Неверный логин или пароль')
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
  }, [username, password, onAuth])

  return (
    <motion.div
      key="auth-screen"
      className="preloader-bg"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'var(--color-primary)',
      }}
    >
      {/* Particles */}
      <AuthParticles />

      {/* Radial glow behind card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: success ? 0.5 : 0.15 }}
        transition={{ duration: 1 }}
        style={{
          position: 'absolute',
          width: '80vmax',
          height: '80vmax',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${AMBER}20 0%, ${AMBER}08 30%, transparent 55%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Success spark burst */}
      <AnimatePresence>
        {success && <SparkBurst />}
      </AnimatePresence>

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={
          success
            ? { opacity: 0, y: -30, scale: 0.85 }
            : shake
              ? { opacity: 1, y: 0, scale: 1, x: [0, -12, 12, -8, 8, -4, 4, 0] }
              : { opacity: 1, y: 0, scale: 1 }
        }
        transition={
          success
            ? { duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }
            : shake
              ? { duration: 0.5, ease: 'easeOut' }
              : smooth(0.2)
        }
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="relative rounded-2xl p-8 sm:p-10 overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--color-border)',
            boxShadow: `0 0 40px ${AMBER}10, 0 25px 50px rgba(0,0,0,0.3)`,
          }}
        >
          {/* Electric arcs */}
          <ElectricArc side="left" />
          <ElectricArc side="right" />

          {/* Top glow line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={smooth(0.3)}
            style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: 2,
              background: `linear-gradient(90deg, transparent, ${AMBER}, transparent)`,
              borderRadius: 1,
              boxShadow: `0 0 10px ${AMBER}80`,
            }}
          />

          {/* Lightning icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={smooth(0.1)}
            className="flex justify-center mb-6"
          >
            <motion.div
              animate={success ? { scale: [1, 1.3, 0], rotate: 180 } : { scale: [1, 1.05, 1] }}
              transition={
                success
                  ? { duration: 0.5 }
                  : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              }
              className="relative"
            >
              <HiOutlineLightningBolt
                className="text-5xl sm:text-6xl"
                style={{
                  color: AMBER,
                  filter: `drop-shadow(0 0 12px ${AMBER}80) drop-shadow(0 0 24px ${AMBER}40)`,
                }}
              />
              {/* Pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  border: `2px solid ${AMBER}40`,
                }}
              />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={smooth(0.3)}
            className="text-2xl sm:text-3xl font-bold text-center mb-2 text-on-surface"
          >
            Авторизация
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={smooth(0.4)}
            className="text-center mb-8 text-on-muted text-sm"
          >
            Войдите в панель управления
          </motion.p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Username */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={smooth(0.5)}
              className="mb-4"
            >
              <div
                className="relative flex items-center rounded-xl overflow-hidden"
                style={{
                  background: 'var(--color-primary)',
                  border: `1px solid ${focusedField === 'user' ? AMBER : 'var(--color-border)'}`,
                  boxShadow: focusedField === 'user' ? `0 0 15px ${AMBER}25` : 'none',
                  transition: 'border-color 300ms, box-shadow 300ms',
                }}
              >
                <span className="pl-4 text-on-muted">
                  <FiUser className="text-lg" style={{ color: focusedField === 'user' ? AMBER : undefined }} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('user')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Логин"
                  autoComplete="username"
                  className="w-full py-3.5 px-3 bg-transparent text-on-surface placeholder:text-on-muted/50 outline-none text-sm sm:text-base"
                  data-no-transition
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={smooth(0.6)}
              className="mb-6"
            >
              <div
                className="relative flex items-center rounded-xl overflow-hidden"
                style={{
                  background: 'var(--color-primary)',
                  border: `1px solid ${focusedField === 'pass' ? AMBER : 'var(--color-border)'}`,
                  boxShadow: focusedField === 'pass' ? `0 0 15px ${AMBER}25` : 'none',
                  transition: 'border-color 300ms, box-shadow 300ms',
                }}
              >
                <span className="pl-4 text-on-muted">
                  <FiLock className="text-lg" style={{ color: focusedField === 'pass' ? AMBER : undefined }} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('pass')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Пароль"
                  autoComplete="current-password"
                  className="w-full py-3.5 px-3 bg-transparent text-on-surface placeholder:text-on-muted/50 outline-none text-sm sm:text-base"
                  data-no-transition
                />
              </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -5, height: 0 }}
                  className="mb-4 text-center text-sm"
                  style={{ color: '#ef4444' }}
                >
                  <FiZap className="inline mr-1" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={smooth(0.7)}
            >
              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={success}
                className="w-full py-3.5 rounded-xl font-bold text-sm sm:text-base cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${AMBER}, #d97706)`,
                  color: '#0a1628',
                  boxShadow: `0 4px 15px ${AMBER}40, 0 0 30px ${AMBER}15`,
                  border: 'none',
                  transition: 'box-shadow 300ms, transform 300ms',
                }}
              >
                {success ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <FiZap /> Добро пожаловать!
                  </motion.span>
                ) : (
                  'Войти'
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Bottom glow line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={smooth(0.8)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: '10%',
              right: '10%',
              height: 2,
              background: `linear-gradient(90deg, transparent, ${AMBER}60, transparent)`,
              borderRadius: 1,
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
