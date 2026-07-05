import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { interpolate } from 'flubber'

const AMBER = '#f59e0b'
const AMBER_BRIGHT = '#fbbf24'
const BG_DARK = '#030a14'

// Full bulb outline
const BULB_PATH =
  'M100,20 C55,20 30,60 30,100 C30,135 50,155 60,175 L60,200 L140,200 L140,175 C150,155 170,135 170,100 C170,60 145,20 100,20 Z'

// 10 pieces of the bulb glass for explosion
const BULB_PIECES = [
  'M100,20 C78,20 58,35 45,55 L70,70 L100,45 Z',
  'M45,55 C35,75 30,90 30,100 L55,100 L70,70 Z',
  'M30,100 C30,120 38,140 50,158 L65,140 L55,100 Z',
  'M50,158 L60,175 L60,200 L90,200 L80,155 L65,140 Z',
  'M90,200 L110,200 L100,170 Z',
  'M110,200 L140,200 L140,175 L150,158 L120,155 L100,170 Z',
  'M150,158 C162,140 170,120 170,100 L145,100 L135,140 Z',
  'M170,100 C170,90 165,75 155,55 L130,70 L145,100 Z',
  'M155,55 C142,35 122,20 100,20 L100,45 L130,70 Z',
  'M80,155 L100,170 L120,155 L110,145 L90,145 Z',
]

// Target shapes — small splinters that pieces morph into
const SPLINTER_PATHS = [
  'M0,0 L4,-10 L8,0 Z',
  'M0,0 L6,-8 L10,2 Z',
  'M0,0 L3,-12 L7,-2 Z',
  'M0,0 L8,-5 L6,4 Z',
  'M0,0 L5,-6 L10,0 Z',
  'M0,0 L4,-9 L9,1 Z',
  'M0,0 L7,-4 L5,5 Z',
  'M0,0 L3,-11 L8,-3 Z',
  'M0,0 L6,-7 L10,1 Z',
  'M0,0 L5,-10 L9,-1 Z',
]

function generateSparks(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + (Math.random() - 0.5) * 30
    const distance = 80 + Math.random() * 120
    const rad = (angle * Math.PI) / 180
    return {
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance,
      scale: 0.5 + Math.random() * 0.8,
      delay: Math.random() * 0.3,
    }
  })
}

function generateShardFlights(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + (Math.random() - 0.5) * 25
    const rad = (angle * Math.PI) / 180
    const distance = 200 + Math.random() * 250
    return {
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance - 50,
      rotate: Math.random() * 540 - 270,
    }
  })
}

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// Morphing shard — uses flubber to interpolate from bulb piece to splinter
function MorphingShard({
  fromPath,
  toPath,
  flight,
  delay,
}: {
  fromPath: string
  toPath: string
  flight: { x: number; y: number; rotate: number }
  delay: number
}) {
  const [d, setD] = useState(fromPath)
  const rafRef = useRef(0)

  useEffect(() => {
    const interp = interpolate(fromPath, toPath, { maxSegmentLength: 8 })
    const start = performance.now()
    const duration = 600

    function tick(now: number) {
      const elapsed = now - start - delay * 1000
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(elapsed / duration, 1)
      setD(interp(ease(t)))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [fromPath, toPath, delay])

  return (
    <motion.g
      initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
      animate={{
        x: flight.x,
        y: flight.y,
        rotate: flight.rotate,
        opacity: [1, 0.8, 0],
        scale: [1, 0.6, 0.15],
      }}
      transition={{
        type: 'spring',
        stiffness: 40,
        damping: 9,
        opacity: { duration: 0.7, delay },
        scale: { duration: 0.7, delay },
      }}
    >
      <path d={d} fill={AMBER} opacity={0.85} filter="url(#shardGlow)" />
    </motion.g>
  )
}

interface PreloaderProps {
  onComplete: () => void
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [phase, setPhase] = useState<'draw' | 'glow' | 'explode'>('draw')

  const sparks = useMemo(() => generateSparks(16), [])
  const shardFlights = useMemo(() => generateShardFlights(BULB_PIECES.length), [])

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('glow'), 800),
      setTimeout(() => setPhase('explode'), 2000),
      setTimeout(() => onComplete(), 2350),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  const isGlow = phase === 'glow'

  return (
    <motion.div
      key="preloader"
      className="preloader-bg"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background */}
      <motion.div
        animate={{
          backgroundColor:
            phase === 'draw' ? BG_DARK
            : phase === 'glow' ? '#081020'
            : '#0c1830',
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Ambient room light */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'glow' ? 0.3 : 0 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          width: '140vmax',
          height: '140vmax',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${AMBER}15 0%, ${AMBER}08 30%, transparent 55%)`,
          pointerEvents: 'none',
        }}
      />

      {/* SVG stage */}
      <div style={{ position: 'relative', width: 160, height: 224 }}>
        {/* Main bulb SVG — hidden when exploding */}
        <motion.svg
          viewBox="0 0 200 280"
          width={160}
          height={224}
          animate={{
            opacity: phase === 'explode' ? 0 : 1,
            scale: phase === 'explode' ? 1.05 : 1,
          }}
          transition={{ duration: 0.2 }}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id="glowOutline" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur1" />
              <feGaussianBlur stdDeviation="6" result="blur2" />
              <feGaussianBlur stdDeviation="14" result="blur3" />
              <feMerge>
                <feMergeNode in="blur3" />
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="rectGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feComponentTransfer in="blur" result="bright">
                <feFuncA type="linear" slope="1.5" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="bright" />
              </feMerge>
            </filter>
          </defs>

          {/* Rectangular glow zone */}
          <motion.rect
            x={70} y={115} width={60} height={70} rx={4}
            fill={AMBER}
            filter="url(#rectGlow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: isGlow ? 0.4 : 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />

          {/* Glass bulb outline */}
          <motion.path
            d={BULB_PATH}
            fill="none"
            stroke={isGlow ? AMBER : '#ffffff'}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={isGlow ? 'url(#glowOutline)' : undefined}
            initial={{ pathLength: 0, opacity: 0.8 }}
            animate={{
              pathLength: 1,
              opacity: isGlow ? 0.9 : 0.8,
              stroke: isGlow ? AMBER : '#ffffff',
            }}
            transition={{ pathLength: { duration: 0.8, ease: 'easeInOut' }, stroke: { duration: 0.4 } }}
          />

          {/* Inner fill */}
          <motion.path
            d={BULB_PATH}
            fill={AMBER}
            initial={{ opacity: 0 }}
            animate={{ opacity: isGlow ? 0.07 : 0 }}
            transition={{ duration: 0.6 }}
          />

          {/* Socket */}
          <motion.path
            d="M60,200 L60,240 C60,255 80,265 100,265 C120,265 140,255 140,240 L140,200"
            fill="none"
            stroke={isGlow ? AMBER : '#ffffff'}
            strokeWidth={2.5}
            strokeLinecap="round"
            filter={isGlow ? 'url(#glowOutline)' : undefined}
            initial={{ pathLength: 0, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: isGlow ? 0.8 : 0.6 }}
            transition={{ pathLength: { duration: 0.8, ease: 'easeInOut', delay: 0.1 } }}
          />

          {/* Socket threads */}
          {[210, 222, 234].map((y, i) => (
            <motion.line
              key={y}
              x1={62} y1={y} x2={138} y2={y}
              stroke={isGlow ? AMBER : '#ffffff'}
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: isGlow ? 0.6 : 0.4 }}
              transition={{ pathLength: { duration: 0.3, delay: 0.5 + i * 0.1 } }}
            />
          ))}

          {/* Filament support posts */}
          <motion.line
            x1={88} y1={175} x2={88} y2={148}
            stroke={isGlow ? AMBER_BRIGHT : '#ffffff55'}
            strokeWidth={1.5} strokeLinecap="round"
            filter={isGlow ? 'url(#neonGlow)' : undefined}
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{ pathLength: 1, opacity: isGlow ? 1 : 0.3 }}
            transition={{ pathLength: { duration: 0.4, delay: 0.2 } }}
          />
          <motion.line
            x1={112} y1={175} x2={112} y2={148}
            stroke={isGlow ? AMBER_BRIGHT : '#ffffff55'}
            strokeWidth={1.5} strokeLinecap="round"
            filter={isGlow ? 'url(#neonGlow)' : undefined}
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{ pathLength: 1, opacity: isGlow ? 1 : 0.3 }}
            transition={{ pathLength: { duration: 0.4, delay: 0.25 } }}
          />

          {/* Coiled filament */}
          <motion.path
            d="M88,148 C88,143 91,140 93,143 C95,146 97,138 99,141 C101,144 103,136 105,139 C107,142 109,134 111,137 C112,139 112,145 112,148"
            fill="none"
            stroke={isGlow ? AMBER_BRIGHT : '#ffffff44'}
            strokeWidth={isGlow ? 2.5 : 1.5}
            strokeLinecap="round" strokeLinejoin="round"
            filter={isGlow ? 'url(#neonGlow)' : undefined}
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{
              pathLength: 1,
              opacity: isGlow ? 1 : 0.3,
              stroke: isGlow ? AMBER_BRIGHT : '#ffffff44',
            }}
            transition={{
              pathLength: { duration: 0.5, delay: 0.3, ease: 'easeInOut' },
              stroke: { duration: 0.5 },
              opacity: { duration: 0.5 },
            }}
          />

          {/* White-hot core */}
          {isGlow && (
            <motion.path
              d="M88,148 C88,143 91,140 93,143 C95,146 97,138 99,141 C101,144 103,136 105,139 C107,142 109,134 111,137 C112,139 112,145 112,148"
              fill="none" stroke="#ffffff" strokeWidth={1}
              strokeLinecap="round" strokeLinejoin="round"
              filter="url(#neonGlow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </motion.svg>

        {/* Sparks */}
        {isGlow &&
          sparks.map((spark, i) => (
            <motion.div
              key={`spark-${i}`}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                x: spark.x * 0.6,
                y: spark.y * 0.6,
                scale: [0, spark.scale, 0],
              }}
              transition={{ duration: 0.8, delay: spark.delay, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '40%',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: AMBER,
                boxShadow: `0 0 6px ${AMBER}, 0 0 12px ${AMBER}88`,
                pointerEvents: 'none',
              }}
            />
          ))}

        {/* Morphing shards — bulb pieces morph into splinters via flubber */}
        {phase === 'explode' && (
          <svg
            viewBox="0 0 200 280"
            width={160}
            height={224}
            style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
          >
            <defs>
              <filter id="shardGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {BULB_PIECES.map((piece, i) => (
              <MorphingShard
                key={i}
                fromPath={piece}
                toPath={SPLINTER_PATHS[i]}
                flight={shardFlights[i]}
                delay={i * 0.02}
              />
            ))}
          </svg>
        )}
      </div>
    </motion.div>
  )
}
