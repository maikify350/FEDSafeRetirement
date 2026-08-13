'use client'

/**
 * BookingPageClient — Client component wrapper for the booking page.
 * Manages form state, submission, and transition to confirmation screen.
 */
import { useState } from 'react'

import BookingForm from './BookingForm'
import BookingConfirmation from './BookingConfirmation'
import CompanyHeader from './CompanyHeader'

export type FormFieldToggle = { show: boolean; required: boolean }

export type BookingFormFields = {
  address?: FormFieldToggle
  preferredDate?: FormFieldToggle
  contactPreferences?: FormFieldToggle
  photoUpload?: FormFieldToggle
  companyName?: FormFieldToggle
}

export type BookingSettings = {
  pageTitle: string
  welcomeMessage: string | null
  thankYouMessage: string | null
  primaryColor: string
  formFields: BookingFormFields | null
  maxBookingsPerDay: number | null
  minLeadTimeHours: number
  maxAdvanceDays: number
  termsUrl: string | null
  privacyUrl: string | null
}

export type BookingConfig = {
  company: {
    name: string
    dba: string | null
    phone: string | null
    email: string | null
    website: string | null
    logoUrl: string | null
    address: string | null
    businessHours: any
    showHours: boolean
    socialMedia: {
      facebook: string | null
      instagram: string | null
      yelp: string | null
      google: string | null
    }
  }
  bookingConfig: BookingSettings | null
  defaultStateId: string | null
  serviceItems: Array<{
    id: string
    name: string
    description: string | null
    defaultPrice: number | null
  }>
  states: Array<{ id: string; value: string }>
}

type SubmissionResult = {
  requestNumber: string
  companyName: string
  message: string
}

type Props = {
  config: BookingConfig
  subscriberId: string
}

export default function BookingPageClient({ config, subscriberId }: Props) {
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [customerName, setCustomerName] = useState('')

  const handleSuccess = (data: SubmissionResult, firstName: string) => {
    setCustomerName(firstName)
    setResult(data)
  }

  const handleReset = () => {
    setResult(null)
    setCustomerName('')
  }

  return (
    <div className='w-full max-w-2xl mx-auto'>
      <CompanyHeader company={config.company} />

      {result ? (
        <BookingConfirmation
          result={result}
          customerName={customerName}
          company={config.company}
          thankYouMessage={config.bookingConfig?.thankYouMessage}
          primaryColor={config.bookingConfig?.primaryColor}
          onReset={handleReset}
        />
      ) : (
        <BookingForm
          config={config}
          subscriberId={subscriberId}
          onSuccess={handleSuccess}
        />
      )}

      {/* Footer */}
      <div className='text-center mt-6 mb-4'>
        <p className='text-xs text-gray-400'>
          Powered by{' '}
          <a
            href='https://www.jobmaster.com'
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-400 hover:text-blue-500 transition-colors'
          >
            JobMaster
          </a>
        </p>
      </div>
    </div>
  )
}
