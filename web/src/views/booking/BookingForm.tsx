'use client'

/**
 * BookingForm — Public-facing service request form.
 * Uses pure Tailwind + native form elements (no MUI needed for public page).
 * Responsive: mobile-first with desktop multi-column.
 * Respects bookingConfig settings for form fields, branding, and date rules.
 */
import { useState, useMemo, useCallback, useRef, type DragEvent } from 'react'

import AddressAutocomplete from '@/components/AddressAutocomplete'

import type { BookingConfig, BookingFormFields } from './BookingPageClient'
import { COLORS } from '../../theme/designTokens'


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

type Props = {
  config: BookingConfig
  subscriberId: string
  onSuccess: (data: { requestNumber: string; companyName: string; message: string }, firstName: string) => void
}

type FormData = {
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  serviceItemId: string
  requestDate: string
  description: string
  street: string
  street2: string
  city: string
  stateId: string
  zipCode: string
  preferredContactMethod: string
  preferredContactTime: string
}

const initialForm: FormData = {
  firstName: '',
  lastName: '',
  company: '',
  email: '',
  phone: '',
  serviceItemId: '',
  requestDate: '',
  description: '',
  street: '',
  street2: '',
  city: '',
  stateId: '',
  zipCode: '',
  preferredContactMethod: '',
  preferredContactTime: '',
}

/** Helper: check if a form field section is visible */
function fieldVisible(fields: BookingFormFields | null | undefined, key: keyof BookingFormFields): boolean {
  if (!fields) return true // default: show everything
  return fields[key]?.show !== false
}

/** Helper: check if a form field section is required */
function fieldRequired(fields: BookingFormFields | null | undefined, key: keyof BookingFormFields): boolean {
  if (!fields) return false
  return fields[key]?.required === true
}

export default function BookingForm({ config, subscriberId, onSuccess }: Props) {
  const [form, setForm] = useState<FormData>(() => ({
    ...initialForm,
    stateId: config.defaultStateId || '',
  }))
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [validationSummary, setValidationSummary] = useState<string[]>([])
  const validationBannerRef = useRef<HTMLDivElement>(null)

  // Photo upload state
  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; preview: string; name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const MAX_PHOTOS = 5

  const bc = config.bookingConfig
  const formFields = bc?.formFields
  const primaryColor = bc?.primaryColor || COLORS.infoDark
  const pageTitle = bc?.pageTitle || 'Request a Service'
  const welcomeMessage = bc?.welcomeMessage

  // Calculate date constraints from config
  const { minDate, maxDate } = useMemo(() => {
    const now = new Date()
    const leadHours = bc?.minLeadTimeHours || 0
    const advanceDays = bc?.maxAdvanceDays || 90

    const min = new Date(now.getTime() + leadHours * 60 * 60 * 1000)
    const max = new Date(now.getTime() + advanceDays * 24 * 60 * 60 * 1000)

    return {
      minDate: min.toISOString().split('T')[0],
      maxDate: max.toISOString().split('T')[0],
    }
  }, [bc?.minLeadTimeHours, bc?.maxAdvanceDays])

  // Visibility flags
  const showAddress = fieldVisible(formFields, 'address')
  const showPreferredDate = fieldVisible(formFields, 'preferredDate')
  const showContactPrefs = fieldVisible(formFields, 'contactPreferences')
  const showCompanyName = fieldVisible(formFields, 'companyName')

  // Required flags — address is always required for field service businesses
  const addressRequired = true
  const dateRequired = fieldRequired(formFields, 'preferredDate')
  const contactPrefsRequired = fieldRequired(formFields, 'contactPreferences')
  const companyRequired = fieldRequired(formFields, 'companyName')

  const inputClass =
    'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const sectionTitleClass = 'text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2'

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
      setValidationSummary([]) // Clear banner when user starts fixing
    }
  }

  /** Handle Google Places selection — auto-fill city, state, zip */
  const handlePlaceSelected = useCallback((place: { street: string; city: string; state: string; zipCode: string }) => {
    // Match state abbreviation to our states list (by value which stores abbreviation like "MD")
    const matchedState = config.states.find(
      s => s.value.toUpperCase() === place.state.toUpperCase()
    )

    setForm(prev => ({
      ...prev,
      street: place.street || prev.street,
      city: place.city || '',
      stateId: matchedState?.id || '',
      zipCode: place.zipCode || '',
    }))
    // Clear address errors since user just auto-filled
    setErrors(prev => ({ ...prev, street: undefined, city: undefined, zipCode: undefined }))
  }, [config.states])

  /** Upload files to public upload endpoint */
  const handlePhotoUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArray.length === 0) return

    const remaining = MAX_PHOTOS - uploadedPhotos.length
    const toUpload = fileArray.slice(0, remaining)
    if (toUpload.length === 0) return

    setUploading(true)
    const newPhotos: typeof uploadedPhotos = []

    for (const file of toUpload) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`${BACKEND_URL}/api/public/upload/${subscriberId}`, {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()
          newPhotos.push({
            url: data.url,
            preview: URL.createObjectURL(file),
            name: file.name,
          })
        }
      } catch {
        // Skip failed uploads silently
      }
    }

    setUploadedPhotos(prev => [...prev, ...newPhotos])
    setUploading(false)
  }, [uploadedPhotos.length, subscriberId])

  const removePhoto = useCallback((index: number) => {
    setUploadedPhotos(prev => {
      const removed = prev[index]
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) handlePhotoUpload(e.dataTransfer.files)
  }, [handlePhotoUpload])

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {}

    if (!form.firstName.trim()) errs.firstName = 'First name is required'
    if (!form.lastName.trim()) errs.lastName = 'Last name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email'
    if (!form.phone.trim()) errs.phone = 'Phone number is required'
    if (!form.description.trim()) errs.description = 'Please describe what you need'

    // Conditional required fields
    if (companyRequired && !form.company.trim()) errs.company = 'Company name is required'
    if (dateRequired && !form.requestDate) errs.requestDate = 'Preferred date is required'
    if (addressRequired && !form.street.trim()) errs.street = 'Street address is required'
    if (contactPrefsRequired && !form.preferredContactMethod) errs.preferredContactMethod = 'Please select a contact method'

    setErrors(errs)
    const errorMessages = Object.values(errs).filter(Boolean) as string[]
    setValidationSummary(errorMessages)

    if (errorMessages.length > 0) {
      // Scroll to the validation banner so user sees the errors
      setTimeout(() => validationBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    }

    return errorMessages.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    // Clear validation summary on successful validation
    setValidationSummary([])

    setSubmitting(true)
    setSubmitError(null)

    try {
      const body: Record<string, any> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
      }

      // Optional fields
      if (form.company.trim()) body.company = form.company.trim()
      if (form.serviceItemId) body.serviceItemId = form.serviceItemId
      if (form.requestDate) body.requestDate = form.requestDate
      if (form.street.trim()) body.street = form.street.trim()
      if (form.street2.trim()) body.street2 = form.street2.trim()
      if (form.city.trim()) body.city = form.city.trim()
      if (form.stateId) body.stateId = form.stateId
      if (form.zipCode.trim()) body.zipCode = form.zipCode.trim()
      if (form.preferredContactMethod) body.preferredContactMethod = form.preferredContactMethod
      if (form.preferredContactTime) body.preferredContactTime = form.preferredContactTime
      if (uploadedPhotos.length > 0) body.photoUrls = uploadedPhotos.map(p => p.url)

      const res = await fetch(`${BACKEND_URL}/api/public/booking/${subscriberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 429) {
        setSubmitError('Too many requests. Please wait a moment and try again.')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError(data.error || 'Something went wrong. Please try again.')
        return
      }

      const data = await res.json()
      onSuccess(data, form.firstName.trim())
    } catch {
      setSubmitError('Unable to connect. Please check your internet and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const FieldError = ({ field }: { field: keyof FormData }) =>
    errors[field] ? <p className='text-xs text-red-500 mt-1'>{errors[field]}</p> : null

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className='bg-white border border-t-0 border-gray-200 shadow-sm px-6 py-5 sm:px-8'>
        {/* Section title bar — uses primary color */}
        <div className='-mx-6 sm:-mx-8 -mt-5 px-6 sm:px-8 py-3 mb-6' style={{ backgroundColor: primaryColor }}>
          <h2 className='text-white text-lg font-semibold'>{pageTitle}</h2>
        </div>

        {/* Welcome message */}
        {welcomeMessage && (
          <div className='mb-6 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100'>
            {welcomeMessage}
          </div>
        )}

        {/* Contact Information */}
        <div className='mb-6'>
          <div className={sectionTitleClass}>
            <i className='tabler-user' style={{ color: primaryColor }} />
            Contact Information
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <label className={labelClass}>First Name *</label>
              <input
                type='text'
                value={form.firstName}
                onChange={set('firstName')}
                placeholder='John'
                className={`${inputClass} ${errors.firstName ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                style={{ '--tw-ring-color': primaryColor } as any}
              />
              <FieldError field='firstName' />
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input
                type='text'
                value={form.lastName}
                onChange={set('lastName')}
                placeholder='Doe'
                className={`${inputClass} ${errors.lastName ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                style={{ '--tw-ring-color': primaryColor } as any}
              />
              <FieldError field='lastName' />
            </div>
          </div>

          {showCompanyName && (
            <div className='mt-3'>
              <label className={labelClass}>Company Name{companyRequired ? ' *' : ''}</label>
              <input
                type='text'
                value={form.company}
                onChange={set('company')}
                placeholder={companyRequired ? 'Company name' : 'Optional'}
                className={`${inputClass} ${errors.company ? 'border-red-400 ring-1 ring-red-400' : ''}`}
              />
              <FieldError field='company' />
            </div>
          )}

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3'>
            <div>
              <label className={labelClass}>Email *</label>
              <input
                type='email'
                value={form.email}
                onChange={set('email')}
                placeholder='john@example.com'
                className={`${inputClass} ${errors.email ? 'border-red-400 ring-1 ring-red-400' : ''}`}
              />
              <FieldError field='email' />
            </div>
            <div>
              <label className={labelClass}>Phone *</label>
              <input
                type='tel'
                value={form.phone}
                onChange={set('phone')}
                placeholder='(555) 123-4567'
                className={`${inputClass} ${errors.phone ? 'border-red-400 ring-1 ring-red-400' : ''}`}
              />
              <FieldError field='phone' />
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className='mb-6'>
          <div className={sectionTitleClass}>
            <i className='tabler-tools' style={{ color: primaryColor }} />
            Service Visit Details
          </div>

          {/* Service type + Preferred date — side by side */}
          <div className='grid grid-cols-1 sm:grid-cols-[4fr_1fr] gap-3 mb-3'>
            {config.serviceItems.length > 0 && (
              <div>
                <label className={labelClass}>Type of Service</label>
                <select value={form.serviceItemId} onChange={set('serviceItemId')} className={inputClass}>
                  <option value=''>Select a service (optional)</option>
                  {config.serviceItems.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.defaultPrice ? ` — $${s.defaultPrice.toFixed(2)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showPreferredDate && (
              <div>
                <label className={labelClass}>Preferred Date{dateRequired ? ' *' : ''}</label>
                <input
                  type='date'
                  value={form.requestDate}
                  onChange={set('requestDate')}
                  min={minDate}
                  max={maxDate}
                  className={`${inputClass} ${errors.requestDate ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                />
                <FieldError field='requestDate' />
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Describe what you need *</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder='Please describe the service you need, including any relevant details...'
              rows={4}
              className={`${inputClass} resize-none ${errors.description ? 'border-red-400 ring-1 ring-red-400' : ''}`}
            />
            <FieldError field='description' />
          </div>

          {/* Photo Upload */}
          <div className='mt-3'>
            <label className={labelClass}>
              <i className='tabler-camera text-base mr-1' style={{ color: primaryColor }} />
              Photos ({uploadedPhotos.length}/{MAX_PHOTOS})
              <span className='text-xs font-normal text-gray-400 ml-1'>(optional)</span>
            </label>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => uploadedPhotos.length < MAX_PHOTOS && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              } ${uploadedPhotos.length >= MAX_PHOTOS ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                multiple
                hidden
                onChange={e => {
                  if (e.target.files) handlePhotoUpload(e.target.files)
                  e.target.value = '' // Reset to allow re-uploading same file
                }}
              />
              {uploading ? (
                <div className='flex items-center justify-center gap-2 py-2'>
                  <svg className='animate-spin h-5 w-5 text-gray-500' viewBox='0 0 24 24' fill='none'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                  </svg>
                  <span className='text-sm text-gray-500'>Uploading...</span>
                </div>
              ) : (
                <>
                  <i className='tabler-cloud-upload text-2xl text-gray-400' />
                  <p className='text-sm text-gray-500 mt-1'>
                    {uploadedPhotos.length >= MAX_PHOTOS
                      ? 'Maximum photos reached'
                      : 'Drag & drop photos or click to browse'}
                  </p>
                  <p className='text-xs text-gray-400 mt-0.5'>JPEG, PNG, WebP — max 10MB each</p>
                </>
              )}
            </div>

            {/* Thumbnail previews */}
            {uploadedPhotos.length > 0 && (
              <div className='flex flex-wrap gap-2 mt-2'>
                {uploadedPhotos.map((photo, i) => (
                  <div key={i} className='relative group'>
                    <img
                      src={photo.preview}
                      alt={photo.name}
                      className='w-20 h-20 object-cover rounded-lg border border-gray-200'
                    />
                    <button
                      type='button'
                      onClick={e => { e.stopPropagation(); removePhoto(i) }}
                      className='absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm'
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Service Address — conditional */}
        {showAddress && (
          <div className='mb-6'>
            <div className={sectionTitleClass}>
              <i className='tabler-map-pin' style={{ color: primaryColor }} />
              Service Address
              {!addressRequired && <span className='text-xs font-normal text-gray-400 ml-1'>(optional)</span>}
            </div>

            <div className='space-y-3'>
              <div>
                <AddressAutocomplete
                  value={form.street}
                  onChange={val => {
                    setForm(prev => ({ ...prev, street: val }))
                    if (errors.street) setErrors(prev => ({ ...prev, street: undefined }))
                  }}
                  onPlaceSelected={handlePlaceSelected}
                  label={`Street Address${addressRequired ? ' *' : ''}`}
                  placeholder='Start typing an address...'
                  size='medium'
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: COLORS.white,
                      borderRadius: '0.5rem',
                      '& fieldset': { border: `1px solid ${COLORS.gray350}`, borderRadius: '0.5rem' },
                      '&:hover fieldset': { borderColor: COLORS.gray400lc },
                      '&.Mui-focused fieldset': { border: `2px solid ${primaryColor}` },
                    },
                  }}
                />
                <FieldError field='street' />
              </div>
              <div>
                <label className={labelClass}>Unit, Apt, Suite</label>
                <input
                  type='text'
                  value={form.street2}
                  onChange={set('street2')}
                  placeholder='Apt 4B'
                  className={inputClass}
                />
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                <div className='col-span-2 sm:col-span-1'>
                  <label className={labelClass}>City</label>
                  <input
                    type='text'
                    value={form.city}
                    onChange={set('city')}
                    placeholder='Fairfax'
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select value={form.stateId} onChange={set('stateId')} className={inputClass}>
                    <option value=''>—</option>
                    {config.states.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>ZIP Code</label>
                  <input
                    type='text'
                    value={form.zipCode}
                    onChange={set('zipCode')}
                    placeholder='22030'
                    maxLength={10}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Preferences — conditional */}
        {showContactPrefs && (
          <div className='mb-8'>
            <div className={sectionTitleClass}>
              <i className='tabler-message-circle' style={{ color: primaryColor }} />
              Contact Preferences
              {!contactPrefsRequired && <span className='text-xs font-normal text-gray-400 ml-1'>(optional)</span>}
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label className={labelClass}>Best way to reach you?{contactPrefsRequired ? ' *' : ''}</label>
                <div className='flex flex-wrap gap-2'>
                  {['Phone', 'Email', 'Text'].map(method => (
                    <label
                      key={method}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        form.preferredContactMethod === method
                          ? 'bg-opacity-10 text-opacity-100'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                      style={
                        form.preferredContactMethod === method
                          ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15`, color: primaryColor }
                          : undefined
                      }
                    >
                      <input
                        type='radio'
                        name='contactMethod'
                        value={method}
                        checked={form.preferredContactMethod === method}
                        onChange={set('preferredContactMethod')}
                        className='sr-only'
                      />
                      {method}
                    </label>
                  ))}
                </div>
                <FieldError field='preferredContactMethod' />
              </div>
              <div>
                <label className={labelClass}>Best time to reach you?</label>
                <div className='flex flex-wrap gap-2'>
                  {['Morning', 'Afternoon', 'Evening', 'Anytime'].map(time => (
                    <label
                      key={time}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        form.preferredContactTime === time
                          ? 'bg-opacity-10'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                      style={
                        form.preferredContactTime === time
                          ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15`, color: primaryColor }
                          : undefined
                      }
                    >
                      <input
                        type='radio'
                        name='contactTime'
                        value={time}
                        checked={form.preferredContactTime === time}
                        onChange={set('preferredContactTime')}
                        className='sr-only'
                      />
                      {time}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Terms & Privacy links */}
        {(bc?.termsUrl || bc?.privacyUrl) && (
          <div className='mb-4 text-xs text-gray-500 text-center'>
            By submitting, you agree to our{' '}
            {bc.termsUrl && (
              <a href={bc.termsUrl} target='_blank' rel='noopener noreferrer' className='underline hover:text-gray-700'>
                Terms of Service
              </a>
            )}
            {bc.termsUrl && bc.privacyUrl && ' and '}
            {bc.privacyUrl && (
              <a href={bc.privacyUrl} target='_blank' rel='noopener noreferrer' className='underline hover:text-gray-700'>
                Privacy Policy
              </a>
            )}
            .
          </div>
        )}

        {/* Validation Summary Banner */}
        {validationSummary.length > 0 && (
          <div ref={validationBannerRef} className='bg-red-50 border border-red-300 rounded-lg px-4 py-3 mb-4'>
            <div className='flex items-center gap-2 mb-1.5'>
              <i className='tabler-alert-circle text-red-500 text-lg' />
              <p className='text-sm font-semibold text-red-700'>Please fix the following errors:</p>
            </div>
            <ul className='list-disc list-inside text-sm text-red-600 space-y-0.5 pl-1'>
              {validationSummary.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Error (server-side) */}
        {submitError && (
          <div className='bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700'>
            {submitError}
          </div>
        )}
      </div>

      {/* Submit Button — Full width at bottom, uses primary color */}
      <div className='bg-white border border-t-0 border-gray-200 rounded-b-2xl shadow-sm px-6 sm:px-8 py-4'>
        <button
          type='submit'
          disabled={submitting}
          className='w-full py-3 px-6 text-white font-semibold rounded-lg shadow-sm transition-colors text-base disabled:opacity-60'
          style={{ backgroundColor: primaryColor }}
          onMouseEnter={e => {
            if (!submitting) (e.target as HTMLElement).style.opacity = '0.9'
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.opacity = '1'
          }}
        >
          {submitting ? (
            <span className='flex items-center justify-center gap-2'>
              <svg className='animate-spin h-5 w-5 text-white' viewBox='0 0 24 24' fill='none'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Request'
          )}
        </button>
      </div>
    </form>
  )
}
