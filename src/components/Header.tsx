import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineLightningBolt, HiMenu, HiX } from 'react-icons/hi'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

interface NavLink {
  label: string
  href: string
}

const navLinks: NavLink[] = [
  { label: 'О нас', href: '#about' },
  { label: 'Услуги', href: '#services' },
  { label: 'Портфолио', href: '#portfolio' },
  { label: 'Преимущества', href: '#advantages' },
  { label: 'Отзывы', href: '#reviews' },
  { label: 'Контакты', href: '#contacts' },
]

const smooth = (delay: number) => ({
  duration: 0.5,
  ease: [0.25, 0.1, 0.25, 1] as const,
  delay,
})

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setMobileOpen(false)
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setMobileOpen(false)
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 300)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-primary/95 backdrop-blur-md shadow-lg shadow-black/10 border-b border-[var(--color-border)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* Лого */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={smooth(0.2)}
          >
            <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2 group">
              <HiOutlineLightningBolt className="text-accent text-3xl group-hover:rotate-12 transition-transform" />
              <span className="text-base sm:text-xl font-bold">
                <span className="text-accent">Электро</span>
                <span className="text-on-surface">Монтаж</span>
              </span>
            </Link>
          </motion.div>

          {/* Desktop nav — каждая ссылка по очереди */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-on-muted hover:text-accent transition-colors text-sm font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={smooth(0.3 + i * 0.1)}
              >
                {link.label}
              </motion.a>
            ))}
          </nav>

          {/* Theme toggle + CTA — по очереди */}
          <div className="hidden md:flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={smooth(0.3 + navLinks.length * 0.1)}
            >
              <ThemeToggle />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={smooth(0.3 + (navLinks.length + 1) * 0.1)}
            >

              <a href="#contacts"
              onClick={(e) => handleNavClick(e, '#contacts')}
              className="btn-primary text-sm py-2 px-5"
              >
              Заказать звонок
            </a>
          </motion.div>
        </div>

        {/* Mobile кнопка */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={smooth(0.4)}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden text-white p-2"
        >
          {mobileOpen ? <HiX className="text-2xl" /> : <HiMenu className="text-2xl" />}
        </motion.button>
      </div>
    </div>

  {/* Mobile menu */}
  <AnimatePresence>
    {mobileOpen && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="lg:hidden bg-primary/95 backdrop-blur-md border-t border-[var(--color-border)]"
      >
        <nav className="flex flex-col px-4 py-4 gap-3">
          {navLinks.map((link, i) => (
            <motion.a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-on-surface hover:text-accent transition-colors py-2 text-lg"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={smooth(i * 0.06)}
            >
              {link.label}
            </motion.a>
          ))}
          <motion.div
            className="flex items-center justify-between mt-2 gap-3"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={smooth(navLinks.length * 0.06)}
          >
            <ThemeToggle />

            <a href="#contacts"
            onClick={(e) => handleNavClick(e, '#contacts')}
            className="btn-primary text-center"
            >
            Заказать звонок
          </a>
      </motion.div>
      </nav>
      </motion.div>
      )}
</AnimatePresence>
</motion.header>
)
}