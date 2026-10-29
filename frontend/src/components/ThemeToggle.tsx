import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="relative z-10">
      {/* Outer glow effect */}
      <motion.circle
        cx="12" cy="12"
        r="10"
        fill="currentColor"
        opacity="0.2"
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      
      {/* Sun core */}
      <motion.circle
        cx="12" cy="12"
        r="4.5"
        fill="currentColor"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          duration: 0.5, 
          ease: 'backOut',
          type: 'spring',
          stiffness: 200
        }}
      />
      
      {/* Inner highlight */}
      <motion.circle
        cx="10.5" cy="10.5"
        r="1.5"
        fill="white"
        opacity="0.4"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.4 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
      
      {/* Sun rays - static with pulsing animation */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const radians = (angle * Math.PI) / 180
        const x1 = 12 + Math.sin(radians) * 7
        const y1 = 12 - Math.cos(radians) * 7
        const x2 = 12 + Math.sin(radians) * 10
        const y2 = 12 - Math.cos(radians) * 10
        
        return (
          <motion.line
            key={`ray-${angle}`}
            x1={x1} y1={y1} 
            x2={x2} y2={y2}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ 
              opacity: [0.7, 1, 0.7],
              pathLength: 1
            }}
            transition={{ 
              opacity: { duration: 1.5, delay: i * 0.1, repeat: Infinity, ease: 'easeInOut' },
              pathLength: { duration: 0.3, delay: i * 0.05 }
            }}
          />
        )
      })}
      
      {/* Secondary shorter rays between main rays */}
      {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle, i) => {
        const radians = (angle * Math.PI) / 180
        const x1 = 12 + Math.sin(radians) * 7.5
        const y1 = 12 - Math.cos(radians) * 7.5
        const x2 = 12 + Math.sin(radians) * 9
        const y2 = 12 - Math.cos(radians) * 9
        
        return (
          <motion.line
            key={`ray-short-${angle}`}
            x1={x1} y1={y1}
            x2={x2} y2={y2}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{ 
              opacity: { duration: 2, delay: 0.2 + i * 0.15, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        )
      })}
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative z-10">
      <motion.path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="currentColor"
        initial={{ rotate: -30, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'backOut' }}
      />
    </svg>
  )
}

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <motion.button
      onClick={toggle}
      aria-label="Переключить тему"
      className="relative flex items-center justify-between w-[62px] h-[32px] rounded-full p-[3px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #0f2140 0%, #1a3a6e 100%)'
          : 'linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)',
        boxShadow: isDark
          ? '0 0 0 1px rgba(245,158,11,0.25), inset 0 1px 3px rgba(0,0,0,0.4)'
          : '0 0 0 1px rgba(245,158,11,0.5), inset 0 1px 3px rgba(0,0,0,0.15)',
      }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Stars (dark mode) */}
      <AnimatePresence>
        {isDark && (
          <motion.span
            key="stars"
            className="absolute left-2 top-1 flex flex-col gap-[3px] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {[3, 2, 3].map((w, i) => (
              <span
                key={i}
                className="rounded-full bg-white/60"
                style={{ width: w, height: 1.5 }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Clouds (light mode) */}
      <AnimatePresence>
        {!isDark && (
          <motion.span
            key="cloud"
            className="absolute right-2 top-[7px] pointer-events-none"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.3 }}
          >
            <svg width="14" height="8" viewBox="0 0 14 8" fill="white" fillOpacity="0.7">
              <ellipse cx="7" cy="6" rx="6" ry="3" />
              <ellipse cx="5" cy="4" rx="3.5" ry="3" />
              <ellipse cx="9" cy="4.5" rx="3" ry="2.5" />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>

      {/* Thumb */}
      <motion.span
        className="relative z-20 flex items-center justify-center w-[26px] h-[26px] rounded-full shadow-md"
        animate={{ x: isDark ? 0 : 30 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #c0c8e0 0%, #e8eaf6 100%)'
            : 'linear-gradient(135deg, #fff7d6 0%, #fffde7 100%)',
          boxShadow: isDark
            ? '0 2px 8px rgba(0,0,0,0.5)'
            : '0 2px 8px rgba(245,158,11,0.5)',
          color: isDark ? '#3b4a7a' : '#d97706',
        }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: 30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -30, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MoonIcon />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: -30, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 30, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, ease: 'backOut' }}
            >
              <SunIcon />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </motion.button>
  )
}
