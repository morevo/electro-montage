import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { HiOutlineLightningBolt } from 'react-icons/hi'
import { FiChevronDown } from 'react-icons/fi'

function ElectricParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animationId: number

    interface ParticleData {
      x: number; y: number; size: number; speedX: number; speedY: number
      opacity: number; pulse: number; reset: () => void; update: () => void; draw: () => void
    }

    const particles: ParticleData[] = []
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)

    class Particle implements ParticleData {
      x = 0; y = 0; size = 0; speedX = 0; speedY = 0; opacity = 0; pulse = 0
      constructor() { this.reset() }
      reset() {
        this.x = Math.random() * canvas!.width
        this.y = Math.random() * canvas!.height
        this.size = Math.random() * 2 + 0.5
        this.speedX = (Math.random() - 0.5) * 0.8
        this.speedY = (Math.random() - 0.5) * 0.8
        this.opacity = Math.random() * 0.5 + 0.1
        this.pulse = Math.random() * Math.PI * 2
      }
      update() {
        this.x += this.speedX; this.y += this.speedY; this.pulse += 0.02
        this.opacity = 0.1 + Math.sin(this.pulse) * 0.2
        if (this.x < 0 || this.x > canvas!.width) this.speedX *= -1
        if (this.y < 0 || this.y > canvas!.height) this.speedY *= -1
      }
      draw() {
        ctx!.beginPath(); ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(245, 158, 11, ${this.opacity})`; ctx!.fill()
        ctx!.beginPath(); ctx!.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(245, 158, 11, ${this.opacity * 0.15})`; ctx!.fill()
      }
    }

    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 15000))
    for (let i = 0; i < count; i++) particles.push(new Particle())

    const drawLines = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < 150) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(245, 158, 11, ${0.08 * (1 - distance / 150)})`
            ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => { p.update(); p.draw() })
      drawLines()
      animationId = requestAnimationFrame(animate)
    }

    animate()
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
}

const smooth = (delay: number) => ({
  duration: 0.7,
  ease: [0.25, 0.1, 0.25, 1] as const,
  delay,
})

export default function Hero() {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero" className="relative min-h-[85vh] sm:min-h-screen flex items-center justify-center overflow-hidden electric-bg">
      <ElectricParticles />

      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, var(--color-primary) 0%, transparent 15%, transparent 60%, var(--color-primary) 90%)' }} />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">

        {/* 1. Иконка — 0.0s */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={smooth(0.0)}
          className="mb-6"
        >
          <HiOutlineLightningBolt className="text-accent text-5xl sm:text-6xl md:text-8xl mx-auto animate-float"/>
        </motion.div>

        {/* 2. Заголовок — 0.15 / 0.30 / 0.45s */}
        <motion.h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-6 leading-tight">
          {[
            "Профессиональные",
            "электромонтажные",
            "работы"
          ].map((word, i) => (
            <motion.span
              key={word} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={smooth(0.15 + i * 0.15)}
              className={`block ${i === 1 ? "text-accent glow-text" : "text-on-surface"}`}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        {/* 3. Подпись — 0.6s */}
        <motion.p
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={smooth(0.6)}
          className="text-on-muted text-sm sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-2xl mx-auto"
        >
          Выполняем полный спектр электромонтажных работ для квартир, домов и коммерческих объектов. Гарантия качества и
          безопасности.
        </motion.p>

        {/* 4. Кнопки — 0.75s / 0.9s */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {[
            { label: "Рассчитать стоимость", href: "#contacts", cls: "btn-primary text-sm sm:text-lg" },
            { label: "Наши услуги", href: "#services", cls: "btn-outline text-sm sm:text-lg" },
          ].map(({ label, href, cls }, i) => (
            <motion.div
              key={href} initial={{ opacity: 0, translateY: 15 }} animate={{ opacity: 1, translateY: 0 }}
              transition={smooth(0.75 + i * 0.15)}
            >

              <a href={href}
              onClick={(e) => {
              e.preventDefault();
              document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
            }}
              className={cls}
              >
              {label}
            </a>
            </motion.div>
            ))}
        </div>
      </div>

      {/* 5. Стрелка — 1.1s */}
      <motion.a
        href="#about" onClick={handleScroll} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={smooth(1.1)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-accent animate-bounce-slow cursor-pointer"
      >
        <FiChevronDown className="text-4xl"/>
      </motion.a>
    </section>
  )
}