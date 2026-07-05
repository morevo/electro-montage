import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { HiStar } from 'react-icons/hi'
import 'swiper/css'
import 'swiper/css/pagination'

interface Review {
  name: string
  role: string
  rating: number
  text: string
  initials: string
  color: string
}

const reviews: Review[] = [
  {
    name: 'Александр Петров',
    role: 'Владелец квартиры',
    rating: 5,
    text: 'Заменили всю проводку в трёхкомнатной квартире. Работа выполнена аккуратно, точно в срок. Рекомендую!',
    initials: 'АП',
    color: 'from-amber-500 to-orange-600',
  },
  {
    name: 'Мария Сидорова',
    role: 'Дизайнер интерьеров',
    rating: 5,
    text: 'Часто привлекаю ребят на свои объекты. Всегда находят оптимальное решение и отлично выполняют проект освещения.',
    initials: 'МС',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    name: 'Дмитрий Волков',
    role: 'Директор офиса',
    rating: 5,
    text: 'Электрифицировали наш офис на 200м². Серверная, рабочие места, переговорные — всё работает безупречно.',
    initials: 'ДВ',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    name: 'Елена Козлова',
    role: 'Владелец дома',
    rating: 4,
    text: 'Установили систему умного дома в коттедже. Теперь управляю освещением и розетками с телефона. Очень удобно!',
    initials: 'ЕК',
    color: 'from-rose-500 to-pink-600',
  },
  {
    name: 'Игорь Новиков',
    role: 'Руководитель склада',
    rating: 5,
    text: 'Выполнили освещение складского помещения 500м². Качество на высоте, цена адекватная. Спасибо команде!',
    initials: 'ИН',
    color: 'from-blue-500 to-cyan-600',
  },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <HiStar
          key={star}
          className={`text-lg ${star <= rating ? 'text-accent' : 'text-gray-600'}`}
        />
      ))}
    </div>
  )
}

export default function Reviews() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="reviews" className="py-10 sm:py-14 md:py-20 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">
            Отзывы <span className="text-accent">клиентов</span>
          </h2>
          <p className="section-subtitle">
            Что говорят о нас те, кто уже воспользовался нашими услугами
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={16}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="pb-12"
          >
            {reviews.map((review, i) => (
              <SwiperSlide key={i}>
                <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 h-full
                                hover:border-accent/30 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${review.color} flex items-center justify-center text-white font-bold text-sm`}>
                      {review.initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{review.name}</h4>
                      <p className="text-on-muted text-xs">{review.role}</p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-on-muted mt-3 text-sm leading-relaxed">
                    «{review.text}»
                  </p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
      </div>
    </section>
  )
}
