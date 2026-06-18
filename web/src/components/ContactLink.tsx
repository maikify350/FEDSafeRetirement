'use client'

import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

type ContactType = 'email' | 'phone' | 'url'

type Props = {
  value: string
  type: ContactType
  /** Display text — defaults to value if not provided */
  label?: string
  className?: string
}

/**
 * Reusable clickable contact link component.
 * - email  → mailto: (opens default email client)
 * - phone  → tel:    (initiates call on supported devices)
 * - url    → opens in new tab
 *
 * Use this everywhere an email, phone, or URL is displayed.
 *
 * @example
 * <ContactLink type="email" value="john@example.com" />
 * <ContactLink type="phone" value="(301) 471-1059" />
 * <ContactLink type="url"   value="https://example.com" label="Visit site" />
 */
const ContactLink = ({ value, type, label, className }: Props) => {
  if (!value) return null

  const href =
    type === 'email' ? `mailto:${value}` :
    type === 'phone' ? `tel:${value.replace(/\D/g, '')}` :
    value.startsWith('http') ? value : `https://${value}`

  const tooltipLabel =
    type === 'email' ? `Send email to ${value}` :
    type === 'phone' ? `Call ${value}` :
    `Open ${value}`

  const target = type === 'url' ? '_blank' : undefined
  const rel = type === 'url' ? 'noopener noreferrer' : undefined

  return (
    <Tooltip title={tooltipLabel} placement='top'>
      <Typography
        component='a'
        href={href}
        target={target}
        rel={rel}
        variant='body2'
        className={className}
        onClick={e => e.stopPropagation()} // don't trigger row/card click
        sx={{
          color: 'text.secondary',
          textDecoration: 'none',
          '&:hover': {
            color: 'primary.main',
            textDecoration: 'underline'
          },
          cursor: 'pointer',
          transition: 'color 0.15s ease'
        }}
      >
        {label || value}
      </Typography>
    </Tooltip>
  )
}

export default ContactLink
