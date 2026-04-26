'use client'

import { useState } from 'react'
import FedSafeAIPanel from '@/components/FedSafeAIPanel'

export default function AIAssistantPage() {
  const [panelOpen, setPanelOpen] = useState(true)

  return (
    <div className='ai-assistant-page'>
      {/* Trigger button (visible when panel is closed) */}
      {!panelOpen && (
        <div className='ai-assistant-trigger'>
          <button
            id='fedsafe-ai-open-btn'
            className='ai-assistant-trigger-btn'
            onClick={() => setPanelOpen(true)}
          >
            <i className='tabler-robot' />
            <span>Open FEDSafe AI</span>
          </button>
        </div>
      )}

      {/* Info card */}
      <div className='ai-assistant-info'>
        <div className='ai-assistant-info-icon'>
          <i className='tabler-shield-star' />
        </div>
        <div>
          <h1 className='ai-assistant-info-title'>FEDSafe AI — Federal Retirement Intelligence</h1>
          <p className='ai-assistant-info-sub'>
            Ask questions about FEGLI, FERS, CSRS, OPM regulations, survivor benefits, life insurance options,
            and all aspects of federal retirement planning — powered by authoritative OPM documents.
          </p>
        </div>
      </div>

      <FedSafeAIPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      <style>{`
        .ai-assistant-page {
          padding: 32px 24px;
          max-width: 760px;
        }
        .ai-assistant-info {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 24px;
          border-radius: 16px;
          background: var(--mui-palette-background-paper);
          border: 1px solid var(--mui-palette-divider);
          box-shadow: var(--mui-customShadows-sm);
        }
        .ai-assistant-info-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--mui-palette-primary-main), var(--mui-palette-secondary-main));
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          flex-shrink: 0;
        }
        .ai-assistant-info-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--mui-palette-text-primary);
          margin-bottom: 6px;
        }
        .ai-assistant-info-sub {
          font-size: 0.875rem;
          color: var(--mui-palette-text-secondary);
          line-height: 1.6;
        }
        .ai-assistant-trigger {
          margin-bottom: 20px;
        }
        .ai-assistant-trigger-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: var(--mui-palette-primary-main);
          color: #fff;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .ai-assistant-trigger-btn:hover {
          background: var(--mui-palette-primary-dark);
        }
      `}</style>
    </div>
  )
}
