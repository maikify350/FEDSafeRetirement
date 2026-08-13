'use client'

import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import { COLORS } from '../theme/designTokens'


type Priority = 'Emergency' | 'Urgent' | 'High' | 'Normal' | 'Low' | string

type PriorityBadgeProps = {
  priority: Priority | null | undefined
  size?: 'small' | 'medium'
  variant?: 'chip' | 'border' | 'both'
}

/**
 * Visual badge for job/request priority (Emergency, Urgent, High, Normal, Low).
 * Renders as a color-coded MUI Chip, a left border indicator, or both.
 *
 * @module components/PriorityBadge
 *
 * @example
 * <PriorityBadge priority="urgent" />
 * <PriorityBadge priority="high" variant="border" />
 * <PriorityBadge priority="low" variant="both" />
 */
export default function PriorityBadge({ priority, size = 'small', variant = 'chip' }: PriorityBadgeProps) {
  if (!priority) return null

  const getPriorityConfig = (p: string) => {
    const lower = p.toLowerCase()

    if (lower.includes('emergency') || lower.includes('critical')) {
      return {
        color: 'error' as const,
        borderColor: COLORS.errorMui,
        label: 'EMERGENCY',
        icon: 'tabler-alert-triangle'
      }
    }

    if (lower.includes('urgent')) {
      return {
        color: 'error' as const,
        borderColor: COLORS.warningMui,
        label: 'URGENT',
        icon: 'tabler-alert-circle'
      }
    }

    if (lower.includes('high')) {
      return {
        color: 'warning' as const,
        borderColor: COLORS.warningMui,
        label: 'HIGH',
        icon: 'tabler-arrow-up'
      }
    }

    if (lower.includes('low')) {
      return {
        color: 'default' as const,
        borderColor: COLORS.graySlate,
        label: 'LOW',
        icon: 'tabler-arrow-down'
      }
    }

    return {
      color: 'default' as const,
      borderColor: COLORS.grayMuiAlt,
      label: 'NORMAL',
      icon: 'tabler-minus'
    }
  }

  const config = getPriorityConfig(priority)

  if (variant === 'border') {
    return (
      <Box
        className='absolute left-0 top-0 bottom-0'
        style={{
          width: '4px',
          backgroundColor: config.borderColor,
          borderRadius: '4px 0 0 4px'
        }}
      />
    )
  }

  if (variant === 'both') {
    return (
      <>
        <Box
          className='absolute left-0 top-0 bottom-0'
          style={{
            width: '4px',
            backgroundColor: config.borderColor,
            borderRadius: '4px 0 0 4px'
          }}
        />
        <Chip
          label={config.label}
          size={size}
          color={config.color}
          icon={<i className={config.icon} />}
        />
      </>
    )
  }

  return (
    <Chip
      label={config.label}
      size={size}
      color={config.color}
      icon={<i className={config.icon} />}
    />
  )
}
