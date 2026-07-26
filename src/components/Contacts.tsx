import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { HiOutlinePhone, HiOutlineMail } from 'react-icons/hi'
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
    value: '+7 (925) 843-23-22',
    href: 'tel:+79258432322',
  },
  {
    icon: HiOutlineMail,
    label: 'Email',
    value: '8432322@mail.ru',
    href: 'mailto:8432322@mail.ru',
  },
]

export default function Contacts() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="contacts" className="py-6 bg-primary-dark/50 relative" ref={ref}>
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
            Оставьте заявку, и мы перезвоним вам как можно быстрее
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-xl mx-auto grid sm:grid-cols-2 gap-4 sm:gap-6"
        >
          {contactInfo.map((item, i) => {
            const ItemIcon = item.icon
            return (
              <div
                key={i}
                className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-xl bg-surface border border-[var(--color-border)]
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
        </motion.div>
      </div>
    </section>
  )
}
