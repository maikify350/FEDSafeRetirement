'use client'

/**
 * BookingConfirmation — Celebratory modal with confetti explosion.
 * Appears as a centered overlay after successful booking submission.
 */
import { useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'
import { COLORS } from '../../theme/designTokens'


type Props = {
  result: {
    requestNumber: string
    companyName: string
    message: string
  }
  customerName: string
  company: {
    name: string
    logoUrl: string | null
    phone: string | null
    email: string | null
  }
  thankYouMessage?: string | null
  primaryColor?: string | null
  onReset: () => void
}

export default function BookingConfirmation({ result, customerName, company, thankYouMessage, primaryColor, onReset }: Props) {
  const color = primaryColor || COLORS.infoDark

  const fireConfetti = useCallback(() => {
    // Big center burst
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5, x: 0.5 },
      colors: [color, COLORS.success, COLORS.warning, COLORS.error, COLORS.violet, COLORS.pink],
    })

    // Side cannons after 200ms
    setTimeout(() => {
      confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors: [color, COLORS.success, COLORS.warning] })
      confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors: [color, COLORS.violet, COLORS.pink] })
    }, 200)

    // Top shower after 500ms
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 160, origin: { y: 0, x: 0.5 }, gravity: 1.2, colors: [color, COLORS.success, COLORS.warning, COLORS.error] })
    }, 500)

    // Final burst at 800ms
    setTimeout(() => {
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.4, x: 0.3 }, colors: [color, COLORS.violet] })
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.4, x: 0.7 }, colors: [COLORS.success, COLORS.warning] })
    }, 800)
  }, [color])

  useEffect(() => {
    fireConfetti()
  }, [fireConfetti])

  return (
    <>
      {/* Backdrop overlay */}
      <div className='fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
        {/* Modal card */}
        <div
          className='bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[scaleIn_0.3s_ease-out]'
          style={{ animation: 'scaleIn 0.3s ease-out' }}
        >
          {/* Color accent bar at top */}
          <div className='h-1.5' style={{ backgroundColor: color }} />

          <div className='px-6 py-8 text-center'>
            {/* Animated checkmark */}
            <div
              className='w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5'
              style={{ backgroundColor: `${color}15` }}
            >
              <svg className='w-10 h-10' fill='none' stroke={color} viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
              </svg>
            </div>

            {/* THANK YOU heading */}
            <h2 className='text-3xl font-extrabold text-gray-900 mb-1 tracking-tight'>THANK YOU!</h2>
            <p className='text-sm text-gray-500 mb-4'>Your request has been submitted successfully</p>

            {/* Custom message or default */}
            <p className='text-gray-600 mb-5 text-sm leading-relaxed max-w-sm mx-auto'>
              {thankYouMessage
                ? thankYouMessage.replace('{name}', customerName)
                : `${customerName}, your service request has been received and our team has been notified. We'll be in touch shortly!`}
            </p>

            {/* Request details card */}
            <div className='bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 max-w-xs mx-auto mb-5'>
              <div className='flex justify-between items-center text-sm mb-1'>
                <span className='text-gray-500'>Request #</span>
                <span className='font-bold text-gray-900'>{result.requestNumber}</span>
              </div>
              <div className='flex justify-between items-center text-sm'>
                <span className='text-gray-500'>Company</span>
                <span className='font-medium text-gray-700'>{result.companyName}</span>
              </div>
            </div>

            <p className='text-xs text-gray-400 mb-5'>
              A confirmation email will be sent to your email address.
            </p>

            {/* Contact info */}
            {(company.phone || company.email) && (
              <div className='border-t border-gray-100 pt-3 mb-5'>
                <p className='text-xs text-gray-400 mb-1.5'>Need to reach us sooner?</p>
                <div className='flex justify-center gap-4 text-sm'>
                  {company.phone && (
                    <a href={`tel:${company.phone}`} className='text-blue-600 hover:text-blue-700 flex items-center gap-1'>
                      <i className='tabler-phone text-base' />
                      {company.phone}
                    </a>
                  )}
                  {company.email && (
                    <a href={`mailto:${company.email}`} className='text-blue-600 hover:text-blue-700 flex items-center gap-1'>
                      <i className='tabler-mail text-base' />
                      Email Us
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className='flex gap-3 justify-center'>
              <button
                onClick={onReset}
                className='px-5 py-2.5 text-white font-semibold rounded-lg shadow-sm transition-all text-sm hover:shadow-md'
                style={{ backgroundColor: color }}
              >
                OK
              </button>
              <button
                onClick={onReset}
                className='px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-lg transition-colors text-sm'
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline CSS for scale animation */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}
