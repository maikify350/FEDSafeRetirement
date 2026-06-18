'use client'

/**
 * CompanyHeader — Branded company info displayed at top of booking page.
 * Shows logo, name, contact info, hours, and social media links.
 */

type CompanyInfo = {
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

const SocialIcon = ({ url, label, children }: { url: string; label: string; children: React.ReactNode }) => (
  <a
    href={url}
    target='_blank'
    rel='noopener noreferrer'
    aria-label={label}
    className='w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-50 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors'
  >
    {children}
  </a>
)

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_ABBR: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
}

function formatBusinessHours(hours: any): string[] | null {
  if (!hours) return null

  try {
    const parsed = typeof hours === 'string' ? JSON.parse(hours) : hours
    if (!parsed || typeof parsed !== 'object') return null

    const lines: string[] = []

    DAY_ORDER.forEach(day => {
      const entry = parsed[day]
      if (!entry) return
      const abbr = DAY_ABBR[day] || day
      if (entry.isOpen && entry.start && entry.end) {
        const fmt = (t: string) => {
          const [h, m] = t.split(':').map(Number)
          const ampm = h >= 12 ? 'PM' : 'AM'
          return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${ampm}`
        }

        lines.push(`${abbr}: ${fmt(entry.start)} – ${fmt(entry.end)}`)
      } else {
        lines.push(`${abbr}: Closed`)
      }
    })

    return lines.length > 0 ? lines : null
  } catch {
    return typeof hours === 'string' ? [hours] : null
  }
}

export default function CompanyHeader({ company }: { company: CompanyInfo }) {
  const hours = company.showHours ? formatBusinessHours(company.businessHours) : null
  const hasSocial = Object.values(company.socialMedia).some(Boolean)

  return (
    <div className='bg-white rounded-t-2xl shadow-sm border border-b-0 border-gray-200 px-6 py-6 sm:px-8'>
      <div className='flex flex-col sm:flex-row items-center sm:items-start gap-4'>
        {/* Logo */}
        {company.logoUrl && (
          <img
            src={company.logoUrl}
            alt={`${company.name} logo`}
            className='w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-contain bg-gray-50 p-1'
          />
        )}

        {/* Company Info */}
        <div className='text-center sm:text-left flex-1'>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>{company.name}</h1>
          {company.dba && (
            <p className='text-sm text-gray-500 mt-0.5'>DBA: {company.dba}</p>
          )}

          <div className='flex flex-col sm:flex-row flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600'>
            {company.address && (
              <span className='flex items-center gap-1'>
                <i className='tabler-map-pin text-gray-400 text-base' />
                {company.address}
              </span>
            )}
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className='flex items-center gap-1 text-blue-600 hover:text-blue-700'
              >
                <i className='tabler-phone text-base' />
                {company.phone}
              </a>
            )}
            {company.email && (
              <a
                href={`mailto:${company.email}`}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-1 text-blue-600 hover:text-blue-700'
              >
                <i className='tabler-mail text-base' />
                {company.email}
              </a>
            )}
            {company.website && (
              <a
                href={company.website}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-1 text-blue-600 hover:text-blue-700'
              >
                <i className='tabler-world text-base' />
                Website
              </a>
            )}
          </div>

          {hours && (
            <div className='text-xs text-gray-500 mt-2'>
              <p className='font-semibold text-gray-600 mb-1 flex items-center gap-1'>
                <i className='tabler-clock text-gray-400 text-sm' />
                Hours of Operation
              </p>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5'>
                {hours.map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
              </div>
            </div>
          )}

          {hasSocial && (
            <div className='flex gap-2 mt-3 justify-center sm:justify-start'>
              {company.socialMedia.facebook && (
                <SocialIcon url={company.socialMedia.facebook} label='Facebook'>
                  <i className='tabler-brand-facebook text-sm' />
                </SocialIcon>
              )}
              {company.socialMedia.instagram && (
                <SocialIcon url={company.socialMedia.instagram} label='Instagram'>
                  <i className='tabler-brand-instagram text-sm' />
                </SocialIcon>
              )}
              {company.socialMedia.yelp && (
                <SocialIcon url={company.socialMedia.yelp} label='Yelp'>
                  <i className='tabler-star text-sm' />
                </SocialIcon>
              )}
              {company.socialMedia.google && (
                <SocialIcon url={company.socialMedia.google} label='Google Business'>
                  <i className='tabler-brand-google text-sm' />
                </SocialIcon>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
