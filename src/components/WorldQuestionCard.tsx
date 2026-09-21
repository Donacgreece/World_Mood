import type { CSSProperties } from 'react'
import { MessageCircleQuestion, UsersRound } from 'lucide-react'
import type { WorldQuestion } from '../lib/types'

export function WorldQuestionCard({ question, selected, onVote }: {
  question: WorldQuestion | null
  selected: number | null
  onVote: (choice: number) => Promise<void>
}) {
  if (!question) return null
  const total = question.total || 0
  return (
    <section className="social-card world-question-card">
      <div className="social-card-head">
        <div className="social-icon"><MessageCircleQuestion size={19} /></div>
        <div><span>ASK THE WORLD</span><h3>{question.question}</h3></div>
      </div>
      <div className="question-options">
        {question.options.map((option, index) => {
          const count = question.counts[index] || 0
          const percent = total ? Math.round((count / total) * 100) : 0
          return (
            <button key={option} className={selected === index ? 'is-selected' : ''} onClick={() => onVote(index)}>
              <div><strong>{option}</strong><span>{total ? `${percent}%` : 'Vote to reveal'}</span></div>
              <i style={{ '--answer-share': `${percent}%` } as CSSProperties} />
            </button>
          )
        })}
      </div>
      <div className="question-meta"><UsersRound size={14} />{total.toLocaleString()} real response{total === 1 ? '' : 's'}</div>
    </section>
  )
}
