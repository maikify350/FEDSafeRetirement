'use client'

import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import { COLORS } from '../theme/designTokens'


type Skill = 'Plumbing' | 'Electrical' | 'HVAC' | 'General' | 'Carpentry' | 'Roofing' | 'Painting' | string

type SkillBadgesProps = {
  skills: string[] | string | null | undefined
  size?: 'small' | 'medium'
  maxDisplay?: number
}

const skillConfig: Record<string, { icon: string; color: string; label: string }> = {
  plumbing: { icon: '🔧', color: COLORS.infoMuiAlt, label: 'Plumbing' },
  electrical: { icon: '⚡', color: COLORS.warningMui, label: 'Electrical' },
  hvac: { icon: '❄️', color: COLORS.teal, label: 'HVAC' },
  general: { icon: '🔨', color: COLORS.grayMuiAlt, label: 'General' },
  carpentry: { icon: '🪚', color: COLORS.grayBrown, label: 'Carpentry' },
  roofing: { icon: '🏠', color: COLORS.errorMui, label: 'Roofing' },
  painting: { icon: '🎨', color: COLORS.purple, label: 'Painting' },
  landscaping: { icon: '🌿', color: COLORS.successMui, label: 'Landscaping' },
  flooring: { icon: '📐', color: COLORS.grayBlueGray, label: 'Flooring' },
  drywall: { icon: '🧱', color: COLORS.grayBrownAlt, label: 'Drywall' },
  masonry: { icon: '🏗️', color: COLORS.gray700, label: 'Masonry' },
  concrete: { icon: '🏗️', color: COLORS.gray600, label: 'Concrete' }
}

/**
 * Colored trade/skill badge chips for team members (e.g. Plumbing, Electrical, HVAC).
 * Displays up to `maxDisplay` skills with a "+N more" overflow chip.
 * Colors are sourced from the centralized `designTokens.COLORS`.
 *
 * @module components/SkillBadges
 */
export default function SkillBadges({ skills, size = 'small', maxDisplay = 3 }: SkillBadgesProps) {
  if (!skills) return null

  // Convert to array if string
  const skillsArray = Array.isArray(skills) ? skills : [skills]

  // Filter out empty strings
  const validSkills = skillsArray.filter(Boolean)

  if (validSkills.length === 0) return null

  const getSkillConfig = (skill: string) => {
    const lower = skill.toLowerCase().trim()
    return skillConfig[lower] || { icon: '🛠️', color: COLORS.grayMuiAlt, label: skill }
  }

  const displaySkills = validSkills.slice(0, maxDisplay)
  const remainingCount = validSkills.length - maxDisplay

  return (
    <Box className='flex items-center gap-1 flex-wrap'>
      {displaySkills.map((skill, index) => {
        const config = getSkillConfig(skill)
        return (
          <Tooltip key={index} title={config.label}>
            <Chip
              label={
                <Box className='flex items-center gap-1'>
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </Box>
              }
              size={size}
              sx={{
                backgroundColor: `${config.color}20`,
                color: config.color,
                fontWeight: 600,
                '& .MuiChip-label': {
                  paddingLeft: '6px',
                  paddingRight: '6px'
                }
              }}
            />
          </Tooltip>
        )
      })}
      {remainingCount > 0 && (
        <Tooltip title={validSkills.slice(maxDisplay).join(', ')}>
          <Chip
            label={`+${remainingCount}`}
            size={size}
            variant='outlined'
          />
        </Tooltip>
      )}
    </Box>
  )
}
