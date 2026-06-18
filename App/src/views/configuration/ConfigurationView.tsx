'use client'

/**
 * ConfigurationView — Left-nav category list + right-side lookup editor panel.
 * Adapted from /web's ConfigurationView pattern.
 */

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useTheme } from '@mui/material/styles'

import LookupTypeEditor from '@/components/LookupTypeEditor'

// ─── Lookup catalogue ─────────────────────────────────────────────────────────
interface LookupDef {
  type: string
  label: string
  icon: string
  toggleable?: boolean
  hasAbbreviation?: boolean
  readOnly?: boolean
  description: string
  reservedValues?: string[]
}

interface LookupCategory {
  category: string
  icon: string
  items: LookupDef[]
}

const LOOKUP_CATALOGUE: LookupCategory[] = [
  {
    category: 'Geography',
    icon: 'tabler-world',
    items: [
      { type: 'usState', label: 'US States', icon: 'tabler-map', hasAbbreviation: true, description: 'US states and territories with 2-letter abbreviations' },
    ],
  },
  {
    category: 'Lead Management',
    icon: 'tabler-users',
    items: [
      { type: 'leadSource', label: 'Lead Sources', icon: 'tabler-antenna', toggleable: false, description: 'Where leads originate from (OPM, Referral, Web Form, etc.)', reservedValues: ['OPM Data'] },
      { type: 'campaignStatus', label: 'Campaign Statuses', icon: 'tabler-list-check', toggleable: true, description: 'Workflow statuses for campaigns (Draft, Active, Paused, Completed)' },
    ],
  },
]

// ─── Main View ────────────────────────────────────────────────────────────────
export default function ConfigurationView() {
  const theme = useTheme()
  const [selected, setSelected] = useState<LookupDef | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    LOOKUP_CATALOGUE.map(cat => cat.category) // Start with all expanded
  )

  const allExpanded = expandedCategories.length === LOOKUP_CATALOGUE.length

  const handleToggleAll = () => {
    if (allExpanded) setExpandedCategories([])
    else setExpandedCategories(LOOKUP_CATALOGUE.map(cat => cat.category))
  }

  const handleAccordionChange = (category: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedCategories(prev =>
      isExpanded ? [...prev, category] : prev.filter(c => c !== category)
    )
  }

  const activeDef = selected
    ? LOOKUP_CATALOGUE.flatMap(c => c.items).find(i => i.type === selected.type) ?? selected
    : null

  return (
    <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 120px)', pt: 2 }}>

      {/* ── Left: category / type list ────────────────────────────────── */}
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant='subtitle2' fontWeight={700} color='text.primary'>
            Configuration
          </Typography>
          <Chip
            key={allExpanded ? 'collapse' : 'expand'}
            label={allExpanded ? 'Collapse' : 'Expand'}
            size='small'
            onClick={handleToggleAll}
            icon={<i className={allExpanded ? 'tabler-chevrons-up' : 'tabler-chevrons-down'} />}
            sx={{
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
              cursor: 'pointer',
              bgcolor: allExpanded ? 'primary.main' : 'primary.lighter',
              color: allExpanded ? '#fff' : 'primary.main',
              '&:hover': { bgcolor: allExpanded ? 'primary.dark' : 'primary.light' },
              '& .MuiChip-icon': {
                marginLeft: '6px', marginRight: '-4px',
                color: allExpanded ? '#fff !important' : 'primary.main !important',
                fontSize: '1rem'
              }
            }}
          />
        </Box>
        <Divider />

        {/* Accordion sections */}
        {LOOKUP_CATALOGUE.map(cat => (
          <Accordion
            key={cat.category}
            expanded={expandedCategories.includes(cat.category)}
            onChange={handleAccordionChange(cat.category)}
            disableGutters
            elevation={0}
            sx={{
              bgcolor: 'transparent',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { margin: 0 }
            }}
          >
            <AccordionSummary
              expandIcon={<i className='tabler-chevron-down text-base' />}
              sx={{
                minHeight: 32, px: 2, py: '2px',
                '&.Mui-expanded': { minHeight: 32 },
                '& .MuiAccordionSummary-content': { margin: '8px 0', '&.Mui-expanded': { margin: '8px 0' } }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className={`${cat.icon} text-base`} style={{ color: 'var(--mui-palette-text-disabled)' }} />
                <Typography
                  variant='caption'
                  fontWeight={700}
                  color='text.disabled'
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.7rem' }}
                >
                  {cat.category}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, pb: 1 }}>
              <List dense disablePadding>
                {cat.items.map(item => (
                  <ListItemButton
                    key={item.type}
                    selected={item.type === selected?.type}
                    onClick={() => setSelected(item)}
                    sx={{
                      borderRadius: 1, mx: 1, mb: 0.25, px: 1.5, py: '2px',
                      '&.Mui-selected': {
                        bgcolor: 'primary.lightOpacity',
                        '&:hover': { bgcolor: 'primary.lightOpacity' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <i
                        className={`${item.icon} text-base`}
                        style={{ color: item.type === selected?.type ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-secondary)' }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontSize: '0.75rem',
                        fontWeight: item.type === selected?.type ? 600 : 400,
                        color: item.type === selected?.type ? 'primary.main' : 'text.primary',
                        noWrap: true,
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}

        <Box sx={{ height: 16 }} />
      </Box>

      {/* ── Right: editor panel ───────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {!activeDef ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'text.disabled' }}>
            <i className='tabler-adjustments-horizontal text-5xl mb-3' />
            <Typography variant='body1'>Select a configuration item from the left</Typography>
          </Box>
        ) : (
          <Box sx={{ maxWidth: 680 }}>
            {/* Header */}
            <Box sx={{ mb: 2 }}>
              <Typography variant='h5' fontWeight={700}>{activeDef.label}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {activeDef.description}
                {!activeDef.readOnly && ' · Click pencil to edit inline · Drag to reorder'}
              </Typography>
            </Box>

            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className={`${activeDef.icon} text-xl`} style={{ color: 'var(--mui-palette-primary-main)' }} />
                    <Typography variant='subtitle1' fontWeight={600}>
                      {activeDef.label}
                    </Typography>
                    {activeDef.readOnly && (
                      <Chip label='Read-only' size='small' color='default' sx={{ fontSize: '0.65rem', height: 20, ml: 'auto' }} />
                    )}
                  </Box>
                }
                sx={{ pb: 0 }}
              />
              <Divider sx={{ mt: 1 }} />
              <CardContent sx={{ p: 0 }}>
                <LookupTypeEditor
                  key={activeDef.type}
                  lookupType={activeDef.type}
                  title={activeDef.label}
                  toggleable={activeDef.toggleable ?? true}
                  hasAbbreviation={activeDef.hasAbbreviation ?? false}
                  readOnly={activeDef.readOnly ?? false}
                  reservedValues={activeDef.reservedValues}
                />
              </CardContent>
            </Card>

            <Typography variant='caption' color='text.disabled' sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
              Changes are saved automatically
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
