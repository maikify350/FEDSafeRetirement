import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

interface SectionHeaderProps {
  children: React.ReactNode
  /** Optional action element pinned to the right (e.g. a pill "+ Add" chip) */
  action?: React.ReactNode
  className?: string
}

/**
 * Global section header used in detail and edit panels/drawers.
 * Renders an overline label on a subtle shaded background spanning full width.
 * Matches the mobile app section header pattern.
 *
 * Usage:
 *   <SectionHeader>Phone Numbers (3)</SectionHeader>
 *   <SectionHeader action={<AddChip />}>Addresses (2)</SectionHeader>
 */
export default function SectionHeader({ children, action, className }: SectionHeaderProps) {
  return (
    <Box
      className={`flex items-center justify-between px-3 py-0.5 rounded-lg ${className ?? ''}`}
      sx={{ bgcolor: 'action.hover', mb: '2px' }}
    >
      <Typography
        variant='overline'
        color='text.secondary'
        sx={{ lineHeight: '2rem', letterSpacing: '0.08em' }}
      >
        {children}
      </Typography>
      {action && <Box>{action}</Box>}
    </Box>
  )
}
