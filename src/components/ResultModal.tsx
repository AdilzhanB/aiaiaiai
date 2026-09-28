import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  RotateCcw,
  Send,
  ShieldCheck,
  Trophy,
  Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchLeaderboard, submitScore } from '../api'
import { useMotionStore } from '../store'
import type { LeaderboardEntry } from '../types'

export default function ResultModal() {
  const score = useMotionStore((s) => s.score)
  const hits = useMotionStore((s) => s.hits)
  const misses = useMotionStore((s) => s.misses)
  const maxCombo = useMotionStore((s) => s.maxCombo)
  const integrity = useMotionStore((s) => s.integrity)
  const playerName = useMotionStore((s) => s.playerName)
  const setPlayerName = useMotionStore((s) => s.setPlayerName)
  const resetRun = useMotionStore((s) => s.resetRun)
  const setPhase = useMotionStore((s) => s.setPhase)

  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [apiError, setApiError] = useState(false)

  const total = hits + misses
  const accuracy = useMemo(
    () => (total ? Math.round((hits / total) * 100) : 0),
    [hits, total]
  )

  const grade =
    accuracy >= 92 && integrity >= 70
      ? 'S'
      : accuracy >= 80
        ? 'A'
        : accuracy >= 65
          ? 'B'
          : 'C'

  useEffect(() => {
    void fetchLeaderboard().then(setBoard)
  }, [])

  const submit = async () => {
    const name = playerName.trim().slice(0, 18) || 'PILOT'
    setSending(true)
    setApiError(false)

    try {
      const result = await submitScore({
        name,
        score,
        accuracy,
        max_combo: maxCombo
      })
      setBoard(result.leaderboard ?? [])
      setSent(true)
    } catch {
      setApiError(true)
    } finally {
      setSending(false)
    }
  }

  const retry = () => {
    resetRun()
    setPhase('ready')
  }

  return (
    <motion.section
      className="results-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="result-hero">
        <div className="result-grade">{grade}</div>
        <div>
          <span>RUN COMPLETE</span>
          <h1>{integrity > 0 ? 'Рифт пройден.' : 'Сигнал потерян.'}</h1>
          <p>Твой забег сохранён локально. Добавь имя, чтобы отправить результат в таблицу пилотов.</p>
        </div>
      </div>

      <div className="result-grid">
        <div><Zap size={20} /><span>Score</span><strong>{score.toLocaleString()}</strong></div>
        <div><Activity size={20} /><span>Accuracy</span><strong>{accuracy}%</strong></div>
        <div><Trophy size={20} /><span>Max combo</span><strong>×{maxCombo}</strong></div>
        <div><ShieldCheck size={20} /><span>Integrity</span><strong>{integrity}%</strong></div>
      </div>

      <div className="result-lower">
        <div className="score-submit glass-panel">
          <span className="section-label">SAVE RUN</span>
          <div className="score-input-row">
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="Имя пилота"
              maxLength={18}
            />
            <button onClick={submit} disabled={sending || sent}>
              <Send size={17} />
              {sent ? 'Сохранено' : sending ? 'Отправляю' : 'В рейтинг'}
            </button>
          </div>
          {apiError && <small>Backend не отвечает. Запусти Flask и повтори отправку.</small>}
        </div>

        <div className="mini-board glass-panel">
          <div className="mini-board-head">
            <span className="section-label">TOP PILOTS</span>
            <button onClick={() => setPhase('leaderboard')}>Все</button>
          </div>
          {board.length ? (
            board.slice(0, 4).map((entry, index) => (
              <div className="mini-board-row" key={`${entry.name}-${index}`}>
                <b>#{index + 1}</b>
                <span>{entry.name}</span>
                <strong>{entry.score.toLocaleString()}</strong>
              </div>
            ))
          ) : (
            <p className="empty-board">Пока нет сохранённых забегов.</p>
          )}
        </div>
      </div>

      <div className="result-actions">
        <button className="primary-action" onClick={retry}>
          <RotateCcw size={18} /> Ещё один забег
        </button>
        <button className="secondary-action" onClick={() => setPhase('landing')}>
          На главную
        </button>
      </div>
    </motion.section>
  )
}
