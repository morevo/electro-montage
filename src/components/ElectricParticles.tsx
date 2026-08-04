import { useEffect, useRef } from 'react'

export default function ElectricParticles() {
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
