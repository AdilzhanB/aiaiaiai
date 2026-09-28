import { useEffect, useState } from 'react'
import { ArrowLeft, Crown, Medal, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchLeaderboard } from '../api'
import { useMotionStore } from '../store'
import type { LeaderboardEntry } from '../types'

export default function LeaderboardPage() {
  const setPhase = useMotionStore((s) => s.setPhase)
  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchLeaderboard()
      .then(setBoard)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="leaderboard-page">
      <div className="noise" />
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />

      <nav className="product-nav">
        <button className="brand-lockup" onClick={() => setPhase('landing')}>
          <span className="brand-glyph">R</span>
          <span>
            <strong>RIFT//RUNNER</strong>
            <small>MOTION ARCADE</small>
          </span>
        </button>
        <button className="nav-link" onClick={() => setPhase('landing')}>
          <ArrowLeft size={16} /> Назад
        </button>
      </nav>

      <section className="leader-shell">
        <div className="leader-title">
          <div className="scene-eyebrow"><Trophy size={16} /> HALL OF PILOTS</div>
          <h1>Лучшие забеги.</h1>
          <p>Сначала score, затем точность и max combo.</p>
        </div>

        <div className="podium">
          {[1, 0, 2].map((index) => {
            const entry = board[index]
            if (!entry) return <div className="podium-card empty" key={index} />

            return (
              <motion.div
                key={entry.id ?? `${entry.name}-${index}`}
                className={`podium-card place-${index + 1}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                {index === 0 ? <Crown size={28} /> : <Medal size={24} />}
                <span>#{index + 1}</span>
                <strong>{entry.name}</strong>
                <b>{entry.score.toLocaleString()}</b>
                <small>{entry.accuracy}% accuracy · ×{entry.max_combo}</small>
              </motion.div>
            )
          })}
        </div>

        <div className="leader-table glass-panel">
          {loading ? (
            <div className="leader-loading">Загружаю результаты…</div>
          ) : board.length ? (
            board.map((entry, index) => (
              <div className="leader-row" key={entry.id ?? `${entry.name}-${index}`}>
                <span className="leader-place">#{index + 1}</span>
                <strong>{entry.name}</strong>
                <span>{entry.accuracy}%</span>
                <span>×{entry.max_combo}</span>
                <b>{entry.score.toLocaleString()}</b>
              </div>
            ))
          ) : (
            <div className="leader-loading">
              Нет результатов. Запусти backend и стань первым пилотом.
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
