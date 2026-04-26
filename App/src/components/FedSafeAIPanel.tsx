'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

// Minimal SpeechRecognition types for cross-browser support
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface MySpeechRecognition extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition?: new () => MySpeechRecognition
    webkitSpeechRecognition?: new () => MySpeechRecognition
  }
}
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface FedSafeAIPanelProps {
  open: boolean
  onClose: () => void
}

const ALL_QUESTIONS = [
  'What FEGLI options are available at retirement?',
  'How is the Basic Life benefit calculated?',
  'What are the FEGLI Option B age reduction rules?',
  'When can I cancel FEGLI coverage?',
  'What is the difference between FERS and CSRS retirement?',
  'How does the FEGLI Basic Life benefit change after age 65?',
  'What happens to my FEGLI if I leave federal service before retirement?',
  'Can I keep FEGLI coverage as an annuitant?',
  'What is the FERS Special Retirement Supplement?',
  'How is the CSRS annuity calculated?',
  'What survivor benefit options are available under FERS?',
  'How does unused sick leave affect my FERS retirement?',
  'What is the minimum retirement age (MRA) under FERS?',
  'How does the Thrift Savings Plan (TSP) fit into federal retirement?',
  'What is the FEHB and can I keep it in retirement?',
  'What is Option C (Family) FEGLI and who is covered?',
  'How do I apply for a FERS immediate retirement?',
  'What is a deferred FERS retirement?',
  'How are FEGLI premiums calculated for annuitants?',
  'What is the Open Season for federal benefits and when does it occur?',
]

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

export default function FedSafeAIPanel({ open, onClose }: FedSafeAIPanelProps) {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [openCount, setOpenCount] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking]   = useState(false)
  const voiceModeRef               = useRef(false)   // was last question asked via mic?
  const messagesEndRef             = useRef<HTMLDivElement>(null)
  const inputRef                   = useRef<HTMLTextAreaElement>(null)
  const abortRef                   = useRef<AbortController | null>(null)
  const recognitionRef             = useRef<MySpeechRecognition | null>(null)

  // Pick 4 fresh random questions each time panel opens
  const suggestedQuestions = useMemo(
    () => pickRandom(ALL_QUESTIONS, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openCount]
  )

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens + increment counter to re-randomize suggestions
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
      setOpenCount(c => c + 1)
    }
  }, [open])

  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    // Strip markdown symbols before speaking
    const clean = text.replace(/[#*`_~>\[\]]/g, '').replace(/\n+/g, ' ').trim()
    const utt = new SpeechSynthesisUtterance(clean)
    utt.lang = 'en-US'
    utt.rate = 1.0
    utt.onstart = () => setIsSpeaking(true)
    utt.onend = () => setIsSpeaking(false)
    utt.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utt)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  const sendMessage = useCallback(async (text?: string, fromVoice = false) => {
    const content = (text ?? input).trim()
    if (!content || isLoading) return

    stopSpeaking()
    voiceModeRef.current = fromVoice

    const userMsg: Message = { role: 'user', content, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '', timestamp: new Date() }
    setMessages(prev => [...prev, assistantMsg])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const { content: delta } = JSON.parse(data)
            fullResponse += delta
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + delta,
              }
              return updated
            })
          } catch { /* skip malformed chunks */ }
        }
      }

      // Speak the response if question was asked via voice
      if (voiceModeRef.current && fullResponse) {
        speakText(fullResponse)
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: '⚠️ Something went wrong. Please try again.',
        }
        return updated
      })
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [input, isLoading, messages, speakText, stopSpeaking])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    stopSpeaking()
    setIsLoading(false)
  }

  const handleClear = () => {
    abortRef.current?.abort()
    stopSpeaking()
    setMessages([])
    setIsLoading(false)
  }

  // Stop speaking when panel closes
  useEffect(() => { if (!open) stopSpeaking() }, [open, stopSpeaking])

  const toggleDictation = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Safari.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognitionRef.current = recognition

    let interimText = ''
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      interimText = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += t
        else interimText += t
      }
      if (finalText) {
        setInput(prev => (prev + ' ' + finalText).trimStart())
        interimText = ''
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      // Auto-send if input has content from voice
      setTimeout(() => {
        const val = inputRef.current?.value.trim()
        if (val) {
          // trigger send with voice flag
          setInput(prev => { 
            // sendMessage will pick up the state value
            return prev
          })
          inputRef.current?.focus()
        }
      }, 150)
    }

    recognition.onerror = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.start()
    setIsListening(true)
  }, [isListening])

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fedsafe-ai-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Slide-in Panel */}
      <aside className={`fedsafe-ai-panel ${open ? 'open' : ''}`} role='complementary' aria-label='FEDSafe AI Assistant'>
        {/* Header */}
        <div className='fedsafe-ai-header'>
          <div className='fedsafe-ai-header-left'>
            <div className='fedsafe-ai-avatar'>
              <i className='tabler-robot' />
            </div>
            <div>
              <div className='fedsafe-ai-title'>FEDSafe AI</div>
              <div className='fedsafe-ai-subtitle'>Federal Retirement Expert</div>
            </div>
          </div>
          <div className='fedsafe-ai-header-actions'>
            {messages.length > 0 && (
              <button className='fedsafe-ai-icon-btn' onClick={handleClear} title='Clear conversation' id='fedsafe-ai-clear-btn'>
                <i className='tabler-trash' />
              </button>
            )}
            <button className='fedsafe-ai-icon-btn' onClick={onClose} title='Close' id='fedsafe-ai-close-btn'>
              <i className='tabler-x' />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className='fedsafe-ai-messages' id='fedsafe-ai-messages'>
          {messages.length === 0 ? (
            <div className='fedsafe-ai-welcome'>
              <div className='fedsafe-ai-welcome-icon'>
                <i className='tabler-shield-star' />
              </div>
              <h3>Federal Retirement Assistant</h3>
              <p>Ask me anything about FEGLI, FERS, CSRS, OPM retirement regulations, survivor benefits, and more.</p>
              <div className='fedsafe-ai-suggestions'>
                <p className='fedsafe-ai-suggestions-label'>Try asking:</p>
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    id={`fedsafe-ai-suggestion-${i}`}
                    className='fedsafe-ai-suggestion-btn'
                    onClick={() => sendMessage(q)}
                  >
                    <i className='tabler-message-question' />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`fedsafe-ai-message fedsafe-ai-message--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className='fedsafe-ai-msg-avatar'>
                    <i className='tabler-robot' />
                  </div>
                )}
                <div className='fedsafe-ai-msg-bubble'>
                  {msg.role === 'assistant' ? (
                    <div className='fedsafe-ai-markdown'>
                      {msg.content ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        <span className='fedsafe-ai-typing'>
                          <span /><span /><span />
                        </span>
                      )}
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  <span className='fedsafe-ai-msg-time'>{formatTime(msg.timestamp)}</span>
                </div>
                {msg.role === 'user' && (
                  <div className='fedsafe-ai-msg-avatar fedsafe-ai-msg-avatar--user'>
                    <i className='tabler-user' />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className='fedsafe-ai-input-area'>
          <div className='fedsafe-ai-input-wrapper'>
            <textarea
              ref={inputRef}
              id='fedsafe-ai-input'
              className='fedsafe-ai-input'
              placeholder='Ask about FEGLI, FERS, retirement benefits…'
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
            <button
                id='fedsafe-ai-mic-btn'
                className={`fedsafe-ai-mic-btn${isListening ? ' fedsafe-ai-mic-btn--active' : ''}`}
                onClick={toggleDictation}
                title={isListening ? 'Stop recording' : 'Dictate your question'}
                disabled={isLoading}
              >
                <i className={isListening ? 'tabler-microphone-off' : 'tabler-microphone'} />
              </button>
            {isLoading ? (
              <button
                id='fedsafe-ai-stop-btn'
                className='fedsafe-ai-send-btn fedsafe-ai-send-btn--stop'
                onClick={handleStop}
                title='Stop generating'
              >
                <i className='tabler-player-stop' />
              </button>
            ) : (
              <button
                id='fedsafe-ai-send-btn'
                className='fedsafe-ai-send-btn'
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                title='Send message'
              >
                <i className='tabler-send' />
              </button>
            )}
          </div>
          <p className='fedsafe-ai-disclaimer'>
            <i className='tabler-database' style={{fontSize:'0.85rem', verticalAlign:'middle', marginRight:'4px'}} />
            Trained on <strong>500+ pages</strong> across <strong>17 official OPM sources</strong> — PDFs &amp; live web content indexed &amp; cataloged
          </p>
        </div>
      </aside>
    </>
  )
}
