'use client'

import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

interface AuditFooterProps {
  creAt?: string | null
  creBy?: string | null
  modAt?: string | null
  modBy?: string | null
  divider?: boolean
}

/**
 * Compact audit footer — single line with italic abbreviated labels.
 * Format: Created by Admin on 03/12/26 01:17 pm • Last modified by Admin on 03/12/26 05:43 pm
 */
export default function AuditFooter({ creAt, creBy, modAt, modBy, divider = true }: AuditFooterProps) {
  const fmt = (ts?: string | null) => {
    if (!ts) return 'N/A'
    const d = new Date(ts)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(2)
    let h = d.getHours()
    const min = String(d.getMinutes()).padStart(2, '0')
    const ampm = h >= 12 ? 'pm' : 'am'
    h = h % 12 || 12
    return `${mm}/${dd}/${yy} ${h}:${min} ${ampm}`
  }

  return (
    <Box sx={{ pb: 1, pt: divider ? 1 : 0, borderTop: divider ? '1px solid' : 'none', borderColor: 'divider' }}>
      <Typography
        variant='caption'
        sx={{
          fontStyle: 'italic',
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
          color: 'text.disabled',
        }}
      >
        Created by {creBy || 'Unknown'} on {fmt(creAt)}
        {modBy && ` • Last modified by ${modBy} on ${fmt(modAt)}`}
      </Typography>
    </Box>
  )
}
