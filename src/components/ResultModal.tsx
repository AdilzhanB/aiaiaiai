import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, RotateCcw, Send, Trophy, Zap } from 'lucide-react'
import { fetchLeaderboard, submitScore } from '../api'
import { useMotionStore } from '../store'
import type { LeaderboardEntry } from '../types'

export default function ResultModal() {
  const score = useMotionStore((s) => s.score)
  const hits = useMotionStore((s) => s.hits)
  const misses = useMotionStore((s) => s.misses)
  const maxCombo = useMotionStore((s) => s.maxCombo)
  const playerName = useMotionStore((s) => s.playerName)
  const setPlayerName = useMotionStore((s) => s.setPlayerName)
  const resetGame = useMotionStore((s) => s.resetGame)
  const setPhase = useMotionStore((s) => s.setPhase)
  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const accuracy = useMemo(() => {
    const n = hits + misses
    return n ? Math.round(hits / n * 100) : 0
  }, [hits, misses])

  useEffect(() => {
    void fetchLeaderboard().then(setBoard)
  }, [])

  const submit = async () => {
    const name = playerName.trim().slice(0, 18) || 'PLAYER'
    setSending(true)
    try {
      const result = await submitScore({ name, score, accuracy, max_combo: maxCombo })
      setBoard(result.leaderboard ?? [])
      setSent(true)
    } catch {
      setSent(false)
    } finally {
      setSending(false)
    }
  }

  const retry = () => {
    resetGame()
    setPhase('ready')
  }

  return (
    <div className="result-backdrop">
      <motion.section
        className="result-modal glass"
        initial={{ opacity: 0, scale: .92, y: 22 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div className="result-badge"><Award size={22} /> RUN COMPLETE</div>
        <h2>{score >= 1800 ? 'Реактор стабилен.' : 'Система ждёт реванш.'}</h2>
        <p>Ты завершил полный 45-секундный сценарий управления телом.</p>

        <div className="result-stats">
          <div><span>SCORE</span><strong>{score.toLocaleString()}</strong></div>
          <div><span>ACCURACY</span><strong>{accuracy}%</strong></div>
          <div><span>MAX COMBO</span><strong>×{maxCombo}</strong></div>
          <div><span>REACTIONS</span><strong>{hits}/{hits + misses}</strong></div>
        </div>

        <div className="result-columns">
          <div className="submit-card">
            <div className="mini-title"><Zap size={15} /> СОХРАНИТЬ РЕЗУЛЬТАТ</div>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={18}
              placeholder="Твоё имя"
              aria-label="Имя игрока"
            />
            <button className="primary-btn compact" disabled={sending || sent} onClick={submit}>
              <Send size={16} /> {sent ? 'Результат сохранён' : sending ? 'Отправка…' : 'В таблицу'}
            </button>
          </div>

          <div className="leader-card">
            <div className="mini-title"><Trophy size={15} /> TOP REACTORS</div>
            <div className="leader-list">
              {board.length ? board.slice(0, 5).map((e, i) => (
                <div key={`${e.name}-${i}`}>
                  <span>#{i + 1} {e.name}</span>
                  <strong>{e.score.toLocaleString()}</strong>
                </div>
              )) : <span className="muted">Пока нет результатов — стань первым.</span>}
            </div>
          </div>
        </div>

        <button className="secondary-btn retry" onClick={retry}><RotateCcw size={17} /> Ещё один забег</button>
      </motion.section>
    </div>
  )
}
