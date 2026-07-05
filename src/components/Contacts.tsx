import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { HiOutlinePhone, HiOutlineMail, HiOutlineLocationMarker } from 'react-icons/hi'
import { IconType } from 'react-icons'

interface ContactInfo {
  icon: IconType
  label: string
  value: string
  href: string | null
}

const contactInfo: ContactInfo[] = [
  {
    icon: HiOutlinePhone,
    label: 'Телефон',
    value: '+7 (999) 123-45-67',
    href: 'tel:+79991234567',
  },
  {
    icon: HiOutlineMail,
    label: 'Email',
    value: 'info@electromontage.ru',
    href: 'mailto:info@electromontage.ru',
  },
  {
    icon: HiOutlineLocationMarker,
    label: 'Адрес',
    value: 'г. Москва, ул. Электрозаводская, д. 21',
    href: null,
  },
]

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  const d = digits.startsWith('7') ? digits : digits.startsWith('8') ? '7' + digits.slice(1) : '7' + digits
  const limited = d.slice(0, 11)

  if (limited.length <= 1) return '+7'
  if (limited.length <= 4) return `+7 (${limited.slice(1)}`
  if (limited.length <= 7) return `+7 (${limited.slice(1, 4)}) ${limited.slice(4)}`
  if (limited.length <= 9) return `+7 (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7)}`
  return `+7 (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7, 9)}-${limited.slice(9)}`
}

interface FormState {
  name: string
  phone: string
  message: string
}

export default function Contacts() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [form, setForm] = useState<FormState>({ name: '', phone: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 11) {
      setPhoneError('Введите полный номер телефона')
      return false
    }
    setPhoneError('')
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validatePhone(form.phone)) return
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
    setForm({ name: '', phone: '', message: '' })
    setPhoneError('')
  }

  return (
    <section id="contacts" className="py-10 sm:py-14 md:py-20 bg-primary-dark/50 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">
            Свяжитесь <span className="text-accent">с нами</span>
          </h2>
          <p className="section-subtitle">
            Оставьте заявку и мы перезвоним вам в течение 15 минут
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-on-muted mb-2">
                  Ваше имя
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3
                             text-on-surface placeholder-gray-500 focus:outline-none focus:border-accent/50
                             focus:ring-1 focus:ring-accent/30 transition-all"
                  placeholder="Иван Иванов"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-on-muted mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  id="phone"
                  required
                  value={form.phone}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val.replace(/\D/g, '').length === 0) {
                      setForm({ ...form, phone: '' })
                    } else {
                      setForm({ ...form, phone: formatPhone(val) })
                    }
                    if (phoneError) setPhoneError('')
                  }}
                  className={`w-full bg-surface border rounded-xl px-4 py-3
                             text-on-surface placeholder-gray-500 focus:outline-none focus:border-accent/50
                             focus:ring-1 focus:ring-accent/30 transition-all ${phoneError ? 'border-red-500 ring-1 ring-red-500/30' : 'border-white/10'}`}
                  placeholder="+7 (999) 123-45-67"
                />
                <AnimatePresence>
                  {phoneError && (
                    <motion.p
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="text-red-500 text-sm mt-1 overflow-hidden"
                    >
                      {phoneError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-on-muted mb-2">
                  Описание задачи
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3
                             text-on-surface placeholder-gray-500 focus:outline-none focus:border-accent/50
                             focus:ring-1 focus:ring-accent/30 transition-all resize-none"
                  placeholder="Опишите, что нужно сделать..."
                />
              </div>

              <button type="submit" className="w-full btn-primary text-base sm:text-lg py-3 sm:py-4">
                {submitted ? '✓ Заявка отправлена!' : 'Отправить заявку'}
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            {contactInfo.map((item, i) => {
              const ItemIcon = item.icon
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-surface border border-[var(--color-border)]
                             hover:border-accent/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <ItemIcon className="text-accent text-xl" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-on-muted text-xs">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="text-on-surface font-medium hover:text-accent transition-colors text-sm sm:text-base break-all sm:break-normal">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-on-surface font-medium text-sm sm:text-base">{item.value}</p>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="aspect-[16/9] rounded-xl bg-surface border border-[var(--color-border)] flex items-center justify-center overflow-hidden">
              <div className="text-center p-4">
                <HiOutlineLocationMarker className="text-accent text-4xl mx-auto mb-2 opacity-40" />
                <p className="text-on-muted text-sm">Карта будет здесь</p>
                <p className="text-on-muted text-xs mt-1">г. Москва, ул. Электрозаводская, д. 21</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
