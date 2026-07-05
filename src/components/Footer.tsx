import { HiOutlineLightningBolt } from 'react-icons/hi'
import { FaTelegram, FaWhatsapp, FaVk } from 'react-icons/fa'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { IconType } from 'react-icons'

interface NavLink {
  label: string
  href: string
}

interface SocialLink {
  icon: IconType
  href: string
  label: string
}

const navLinks: NavLink[] = [
  { label: 'О нас', href: '#about' },
  { label: 'Услуги', href: '#services' },
  { label: 'Портфолио', href: '#portfolio' },
  { label: 'Преимущества', href: '#advantages' },
  { label: 'Отзывы', href: '#reviews' },
  { label: 'Контакты', href: '#contacts' },
]

const socialLinks: SocialLink[] = [
  { icon: FaTelegram, href: '#', label: 'Telegram' },
  { icon: FaWhatsapp, href: '#', label: 'WhatsApp' },
  { icon: FaVk, href: '#', label: 'VK' },
]

export default function Footer() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="bg-primary-dark border-t border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <HiOutlineLightningBolt className="text-accent text-2xl" />
              <span className="text-lg font-bold">
                <span className="text-accent">Электро</span>
                <span className="text-on-surface">Монтаж</span>
              </span>
            </Link>
            <p className="text-on-muted text-sm leading-relaxed">
              Профессиональные электромонтажные работы в Москве и области. Гарантия качества.
            </p>
          </div>

          <div>
            <h4 className="text-on-surface font-bold mb-4">Навигация</h4>
            <ul className="space-y-2">
              {navLinks.slice(0, 4).map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-on-muted hover:text-accent transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-on-surface font-bold mb-4">Ещё</h4>
            <ul className="space-y-2">
              {navLinks.slice(4).map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-on-muted hover:text-accent transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-on-surface font-bold mb-4">Контакты</h4>
            <p className="text-on-muted text-sm mb-1">+7 (999) 123-45-67</p>
            <p className="text-on-muted text-sm mb-4 break-all sm:break-normal">info@electromontage.ru</p>
            <div className="flex gap-3">
              {socialLinks.map((link, i) => {
                const SocialIcon = link.icon
                return (
                  <a
                    key={i}
                    href={link.href}
                    aria-label={link.label}
                    className="w-10 h-10 rounded-lg bg-surface border border-[var(--color-border)]
                               flex items-center justify-center text-on-muted hover:text-accent
                               hover:border-accent/30 transition-all"
                  >
                    <SocialIcon className="text-lg" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        <div className="h-px bg-[var(--color-border)] mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-on-muted text-sm">
          <p>&copy; 2024 ЭлектроМонтаж. Все права защищены.</p>
          <p>Сделано с ⚡ для вашего комфорта</p>
        </div>
      </div>
    </footer>
  )
}
