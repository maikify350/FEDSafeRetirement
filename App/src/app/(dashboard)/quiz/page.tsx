'use client'

import { useState, useCallback } from 'react'

interface QuizQuestion {
  id: number
  question: string
  choices: string[]
  correctIndex: number
  explanation: string
  topic: string
}

interface QuizResult {
  questionId: number
  selectedIndex: number
  correct: boolean
}

type Screen = 'home' | 'loading' | 'quiz' | 'results'

const TOPIC_ICONS: Record<string, string> = {
  'FEGLI Basic': 'tabler-heart-rate-monitor',
  'FEGLI Option': 'tabler-list-check',
  'FEGLI coverage': 'tabler-shield-check',
  'FERS retirement': 'tabler-user-check',
  'CSRS': 'tabler-building-bank',
  'Open Season': 'tabler-calendar-event',
  'survivor': 'tabler-users',
  'FEHB': 'tabler-stethoscope',
  'Thrift': 'tabler-piggy-bank',
  'Special Retirement': 'tabler-star',
  'Minimum Retirement': 'tabler-clock',
  'premiums': 'tabler-coin',
}

function getTopicIcon(topic: string) {
  for (const [key, icon] of Object.entries(TOPIC_ICONS)) {
    if (topic.toLowerCase().includes(key.toLowerCase())) return icon
  }
  return 'tabler-school'
}

export default function QuizPage() {
  const [screen, setScreen] = useState<Screen>('home')
  const [topics, setTopics] = useState<string[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [results, setResults] = useState<QuizResult[]>([])
  const [chosen, setChosen] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [quizTopic, setQuizTopic] = useState('')
  const [error, setError] = useState('')

  // Load topics on first visit
  const loadTopics = useCallback(async () => {
    if (topics.length > 0) return
    const res = await fetch('/api/quiz')
    const data = await res.json()
    setTopics(data.topics ?? [])
  }, [topics])

  const startQuiz = useCallback(async (topic?: string) => {
    setScreen('loading')
    setError('')
    setResults([])
    setCurrentQ(0)
    setChosen(null)
    setRevealed(false)

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic ?? null }),
      })
      const data = await res.json()
      if (!res.ok || !data.questions?.length) throw new Error(data.error ?? 'No questions returned')
      setQuestions(data.questions)
      setQuizTopic(data.topic)
      setScreen('quiz')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz')
      setScreen('home')
    }
  }, [])

  const handleChoose = (idx: number) => {
    if (revealed) return
    setChosen(idx)
  }

  const handleCheck = () => {
    if (chosen === null) return
    const q = questions[currentQ]
    setResults(prev => [...prev, {
      questionId: q.id,
      selectedIndex: chosen,
      correct: chosen === q.correctIndex,
    }])
    setRevealed(true)
  }

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setScreen('results')
    } else {
      setCurrentQ(prev => prev + 1)
      setChosen(null)
      setRevealed(false)
    }
  }

  const score = results.filter(r => r.correct).length
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0
  const passed = pct >= 70

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <div className='quiz-page'>
        <div className='quiz-hero'>
          <div className='quiz-hero-icon'><i className='tabler-school' /></div>
          <h1 className='quiz-hero-title'>Agent Training Quiz</h1>
          <p className='quiz-hero-sub'>
            Test your federal retirement knowledge with AI-generated questions grounded in official OPM documents.
            Score 70% or above to pass.
          </p>
          <div className='quiz-hero-actions'>
            <button
              id='quiz-random-btn'
              className='quiz-btn quiz-btn--primary quiz-btn--lg'
              onClick={() => startQuiz()}
            >
              <i className='tabler-dice-5' />
              Random Topic Quiz
            </button>
            <button
              id='quiz-pick-btn'
              className='quiz-btn quiz-btn--outline quiz-btn--lg'
              onClick={async () => { await loadTopics(); setSelectedTopic('pick') }}
            >
              <i className='tabler-list' />
              Pick a Topic
            </button>
          </div>
          {error && <div className='quiz-error'><i className='tabler-alert-circle' /> {error}</div>}
        </div>

        {/* Topic picker */}
        {selectedTopic === 'pick' && topics.length > 0 && (
          <div className='quiz-topic-grid'>
            <h2 className='quiz-topic-grid-title'>Choose a Topic</h2>
            <div className='quiz-topics'>
              {topics.map((t, i) => (
                <button
                  key={i}
                  id={`quiz-topic-${i}`}
                  className='quiz-topic-card'
                  onClick={() => { setSelectedTopic(null); startQuiz(t) }}
                >
                  <i className={getTopicIcon(t)} />
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div className='quiz-page quiz-page--center'>
        <div className='quiz-loading'>
          <div className='quiz-loading-spinner' />
          <p>Generating your quiz from OPM documents…</p>
        </div>
      </div>
    )
  }

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  if (screen === 'quiz') {
    const q = questions[currentQ]
    const progress = ((currentQ) / questions.length) * 100

    return (
      <div className='quiz-page'>
        {/* Header bar */}
        <div className='quiz-header'>
          <div className='quiz-topic-badge'>
            <i className={getTopicIcon(quizTopic)} />
            <span>{quizTopic}</span>
          </div>
          <div className='quiz-counter'>
            Question {currentQ + 1} <span>/ {questions.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className='quiz-progress-track'>
          <div className='quiz-progress-fill' style={{ width: `${progress}%` }} />
        </div>

        {/* Question card */}
        <div className='quiz-card'>
          <div className='quiz-q-number'>Q{currentQ + 1}</div>
          <h2 className='quiz-question'>{q.question}</h2>

          <div className='quiz-choices'>
            {q.choices.map((choice, idx) => {
              let state = ''
              if (revealed) {
                if (idx === q.correctIndex) state = 'correct'
                else if (idx === chosen && idx !== q.correctIndex) state = 'wrong'
              } else if (idx === chosen) {
                state = 'selected'
              }
              return (
                <button
                  key={idx}
                  id={`quiz-choice-${idx}`}
                  className={`quiz-choice quiz-choice--${state || 'idle'}`}
                  onClick={() => handleChoose(idx)}
                  disabled={revealed}
                >
                  <span className='quiz-choice-letter'>{String.fromCharCode(65 + idx)}</span>
                  <span className='quiz-choice-text'>{choice.replace(/^[A-D]\)\s*/, '')}</span>
                  {revealed && idx === q.correctIndex && <i className='tabler-check quiz-choice-icon' />}
                  {revealed && idx === chosen && idx !== q.correctIndex && <i className='tabler-x quiz-choice-icon' />}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {revealed && (
            <div className={`quiz-explanation quiz-explanation--${chosen === q.correctIndex ? 'pass' : 'fail'}`}>
              <div className='quiz-explanation-badge'>
                {chosen === q.correctIndex
                  ? <><i className='tabler-circle-check' /> Correct!</>
                  : <><i className='tabler-circle-x' /> Incorrect</>
                }
              </div>
              <p>{q.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className='quiz-actions'>
            {!revealed ? (
              <button
                id='quiz-check-btn'
                className='quiz-btn quiz-btn--primary'
                onClick={handleCheck}
                disabled={chosen === null}
              >
                Check Answer
              </button>
            ) : (
              <button
                id='quiz-next-btn'
                className='quiz-btn quiz-btn--primary'
                onClick={handleNext}
              >
                {currentQ + 1 >= questions.length ? 'See Results' : 'Next Question'}
                <i className='tabler-arrow-right' />
              </button>
            )}
          </div>
        </div>

        {/* Mini score tracker */}
        <div className='quiz-mini-tracker'>
          {questions.slice(0, currentQ).map((_, i) => {
            const r = results[i]
            return (
              <div
                key={i}
                className={`quiz-tracker-dot quiz-tracker-dot--${r?.correct ? 'pass' : 'fail'}`}
                title={`Q${i + 1}: ${r?.correct ? 'Correct' : 'Wrong'}`}
              />
            )
          })}
          <div className='quiz-tracker-dot quiz-tracker-dot--current' title={`Q${currentQ + 1}: Current`} />
          {questions.slice(currentQ + 1).map((_, i) => (
            <div key={i} className='quiz-tracker-dot quiz-tracker-dot--pending' />
          ))}
        </div>
      </div>
    )
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  return (
    <div className='quiz-page'>
      <div className='quiz-results'>
        {/* Score badge */}
        <div className={`quiz-score-ring quiz-score-ring--${passed ? 'pass' : 'fail'}`}>
          <svg viewBox='0 0 120 120'>
            <circle cx='60' cy='60' r='52' fill='none' strokeWidth='8' className='quiz-ring-track' />
            <circle
              cx='60' cy='60' r='52' fill='none' strokeWidth='8'
              className='quiz-ring-fill'
              strokeDasharray={`${(pct / 100) * 326.7} 326.7`}
              strokeLinecap='round'
              transform='rotate(-90 60 60)'
            />
          </svg>
          <div className='quiz-score-label'>
            <span className='quiz-score-pct'>{pct}%</span>
            <span className='quiz-score-sub'>{score}/{questions.length}</span>
          </div>
        </div>

        <div className={`quiz-verdict quiz-verdict--${passed ? 'pass' : 'fail'}`}>
          {passed
            ? <><i className='tabler-trophy' /> PASSED</>
            : <><i className='tabler-refresh-alert' /> NEEDS REVIEW</>
          }
        </div>

        <p className='quiz-results-msg'>
          {passed
            ? `Excellent! You answered ${score} out of ${questions.length} correctly on "${quizTopic}".`
            : `You answered ${score} out of ${questions.length} correctly. Review the material and try again!`
          }
        </p>

        {/* Question review */}
        <div className='quiz-review'>
          <h3 className='quiz-review-title'>Question Review</h3>
          {questions.map((q, i) => {
            const r = results[i]
            return (
              <div key={i} className={`quiz-review-item quiz-review-item--${r?.correct ? 'pass' : 'fail'}`}>
                <div className='quiz-review-header'>
                  <span className={`quiz-review-badge quiz-review-badge--${r?.correct ? 'pass' : 'fail'}`}>
                    {r?.correct ? <i className='tabler-check' /> : <i className='tabler-x' />}
                    Q{i + 1}
                  </span>
                  <p className='quiz-review-q'>{q.question}</p>
                </div>
                {!r?.correct && (
                  <div className='quiz-review-answer'>
                    <span className='quiz-review-wrong'>Your answer: {q.choices[r?.selectedIndex ?? 0]?.replace(/^[A-D]\)\s*/, '')}</span>
                    <span className='quiz-review-correct'>Correct: {q.choices[q.correctIndex]?.replace(/^[A-D]\)\s*/, '')}</span>
                  </div>
                )}
                <p className='quiz-review-explanation'>{q.explanation}</p>
              </div>
            )
          })}
        </div>

        {/* Retry actions */}
        <div className='quiz-results-actions'>
          <button id='quiz-retry-btn' className='quiz-btn quiz-btn--primary' onClick={() => startQuiz(quizTopic)}>
            <i className='tabler-refresh' /> Retry This Topic
          </button>
          <button id='quiz-new-btn' className='quiz-btn quiz-btn--outline' onClick={() => setScreen('home')}>
            <i className='tabler-home' /> New Quiz
          </button>
        </div>
      </div>
    </div>
  )
}
