import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { HiArrowRight } from 'react-icons/hi'
import { services } from '../data/services'

export default function Services() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="services" className="py-10 sm:py-14 md:py-20 bg-primary-dark/50 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">
            Наши <span className="text-accent">услуги</span>
          </h2>
          <p className="section-subtitle">
            Полный спектр электромонтажных работ для любых объектов
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => {
            const Icon = service.icon
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <Link
                  to={`/services/${service.id}`}
                  className="group relative p-4 sm:p-6 md:p-8 rounded-2xl bg-surface border border-[var(--color-border)]
                             hover:border-accent/40 transition-all duration-300 overflow-hidden flex flex-col h-full block"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/0
                                  group-hover:from-accent/5 group-hover:via-transparent group-hover:to-accent/5
                                  transition-all duration-500" />

                  <div className="relative z-10 flex flex-col flex-1">
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-5
                                    group-hover:bg-accent/20 transition-colors">
                      <Icon className="text-accent text-3xl" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-accent transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-on-muted leading-relaxed text-sm flex-1">
                      {service.description}
                    </p>
                    <div className="mt-5 flex items-center gap-2 text-accent text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Подробнее
                      <HiArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-500" />
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
