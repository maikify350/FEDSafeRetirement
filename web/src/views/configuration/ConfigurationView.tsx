'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useQueries, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useTheme } from '@mui/material/styles'

import LookupTypeEditor from './LookupTypeEditor'
import CompanyView from '@/views/company/CompanyView'
import FleetConfigEditor from './FleetConfigEditor'
import AddressFieldsEditor from './AddressFieldsEditor'
import TimeIndicatorEditor from './TimeIndicatorEditor'
import BookingSetupEditor from './BookingSetupEditor'
import StatusDefinitionEditor from './StatusDefinitionEditor'
import ServiceItemsEditor from './ServiceItemsEditor'
import CustomFieldsEditor from './CustomFieldsEditor'
import FaqEditor from './FaqEditor'
import { COLORS } from '../../theme/designTokens'


// ─── Lookup catalogue ─────────────────────────────────────────────────────────
interface LookupDef {
  type: string
  label: string
  icon: string
  toggleable?: boolean
  hasAbbreviation?: boolean
  isColorSwatch?: boolean
  readOnly?: boolean
  description: string
  /** Values that cannot be edited or deleted */
  reservedValues?: string[]
}

interface LookupCategory {
  category: string
  icon: string
  items: LookupDef[]
}

const LOOKUP_CATALOGUE: LookupCategory[] = [
  {
    category: 'Company',
    icon: 'tabler-building',
    items: [
      { type: 'companyProfile', label: 'Company Settings', icon: 'tabler-building', toggleable: false, description: 'Business name, address, contact info, logo' },
      { type: 'organizationType', label: 'Organization Types', icon: 'tabler-building-community', toggleable: false, description: 'LLC, Corporation, Sole Proprietor, etc.' },
      { type: 'customFields', label: 'Custom Fields', icon: 'tabler-forms', toggleable: false, description: 'Define user-defined fields per entity — Client, Job, Quote, Invoice, etc.' },
      { type: 'statusDefinition', label: 'Status Definitions', icon: 'tabler-list-check', toggleable: false, description: 'Workflow statuses for Requests, Quotes, Jobs, Invoices' },
    ],
  },
  {
    category: 'Client',
    icon: 'tabler-users',
    items: [
      { type: 'clientPrefix', label: 'Name Prefixes', icon: 'tabler-address-book', toggleable: false, description: 'Mr., Mrs., Dr., etc.' },
      { type: 'clientSuffix', label: 'Name Suffixes', icon: 'tabler-address-book', toggleable: false, description: 'Jr., Sr., Ph.D., etc.' },
      { type: 'customerType', label: 'Customer Types', icon: 'tabler-user-star', toggleable: true, description: 'Residential, Commercial, etc.' },
      { type: 'creditStatus', label: 'Credit Statuses', icon: 'tabler-credit-card', toggleable: true, description: 'Active, On Hold, Suspended, etc.' },
      { type: 'leadSource', label: 'Lead Sources', icon: 'tabler-antenna', toggleable: false, description: 'Where clients come from', reservedValues: ['Booking Form'] },
      { type: 'phoneType', label: 'Phone Types', icon: 'tabler-phone', toggleable: false, description: 'Main, Mobile, Work, etc.' },
      { type: 'emailType', label: 'Email Types', icon: 'tabler-mail', toggleable: false, description: 'Main, Work, Personal, etc.' },
      { type: 'addressFields', label: 'Address Fields', icon: 'tabler-map-2', toggleable: false, description: 'Configure which address fields are required' },
      { type: 'addressType', label: 'Address Types', icon: 'tabler-map-pin', toggleable: true, description: 'Primary, Billing, Service, etc.' },
    ],
  },
  {
    category: 'Jobs & Scheduling',
    icon: 'tabler-tool',
    items: [
      { type: 'jobType', label: 'Job Types', icon: 'tabler-tool', toggleable: true, description: 'Service, Install, Inspection, etc.' },
      { type: 'holdReason', label: 'Hold Reasons', icon: 'tabler-clock-pause', toggleable: true, description: 'Why a job might be on hold' },
    ],
  },
  {
    category: 'Team',
    icon: 'tabler-user-check',
    items: [
      { type: 'role', label: 'Team Roles', icon: 'tabler-shield-lock', toggleable: true, description: 'Owner, Manager, Technician, etc.' },
      { type: 'department', label: 'Departments', icon: 'tabler-building', toggleable: true, description: 'Operations, Dispatch, Finance, etc.' },
    ],
  },
  {
    category: 'Trade & Services',
    icon: 'tabler-briefcase',
    items: [
      { type: 'trade', label: 'Trade Types', icon: 'tabler-hammer', toggleable: true, description: 'HVAC, Plumbing, Electrician, etc.' },
      { type: 'productCategory', label: 'Product Categories', icon: 'tabler-category', toggleable: true, description: 'Service, Hardware, Software, etc.' },
      { type: 'unit', label: 'Units of Measure', icon: 'tabler-ruler', toggleable: false, description: 'Each, Hour, Sq Ft, Gallon, etc.' },
      { type: 'serviceItems', label: 'Products & Services', icon: 'tabler-package', toggleable: false, description: 'Manage products and services for quotes, jobs, and invoices' },
    ],
  },
  {
    category: 'Vendors & Finance',
    icon: 'tabler-building-store',
    items: [
      { type: 'vendorCategory', label: 'Vendor Categories', icon: 'tabler-building-store', toggleable: true, description: 'Supplies, Materials, Subcontractor, etc.' },
      { type: 'paymentTerms', label: 'Payment Terms', icon: 'tabler-calendar-dollar', toggleable: true, description: 'COD, Net 30, Net 60, etc.' },
      { type: 'glAccount', label: 'G/L Accounts', icon: 'tabler-book-2', toggleable: false, description: 'General ledger account codes' },
      { type: 'fob', label: 'FOB Terms', icon: 'tabler-truck', toggleable: false, description: 'FOB Origin, Destination, etc.' },
      { type: 'carrier', label: 'Carriers', icon: 'tabler-package', toggleable: false, description: 'FedEx, UPS, USPS, DHL' },
    ],
  },
  {
    category: 'Inventory',
    icon: 'tabler-box',
    items: [
      { type: 'manufacturer', label: 'Manufacturers', icon: 'tabler-building-factory', toggleable: false, description: 'Equipment and product manufacturers' },
      { type: 'equipmentCategory', label: 'Equipment Categories', icon: 'tabler-device-desktop-analytics', toggleable: false, description: 'Site equipment categories' },
      { type: 'colorSwatch', label: 'Color Swatches', icon: 'tabler-palette', toggleable: false, isColorSwatch: true, description: 'Color palette for tagging and labels' },
    ],
  },
  {
    category: 'Fleet',
    icon: 'tabler-truck',
    items: [
      { type: 'vehicleType', label: 'Vehicle Types', icon: 'tabler-car', toggleable: true, description: 'Types of fleet vehicles (trucks, vans, cars, heavy equipment)' },
      { type: 'vehicle_make', label: 'Vehicle Makes', icon: 'tabler-car-garage', toggleable: true, description: 'Vehicle manufacturers (Ford, Chevrolet, Toyota, etc.)' },
      { type: 'vehicle_status', label: 'Vehicle Statuses', icon: 'tabler-circle-check', toggleable: true, description: 'Status options for fleet vehicles (Active, In Service, Out of Service, etc.)' },
      { type: 'fleetConfig', label: 'Fleet Config', icon: 'tabler-settings', toggleable: false, description: 'Fleet configuration settings' },
    ],
  },
  {
    category: 'Geography',
    icon: 'tabler-world',
    items: [
      { type: 'country', label: 'Countries', icon: 'tabler-world', readOnly: true, description: 'Country list — read-only system data' },
      { type: 'usState', label: 'US States', icon: 'tabler-map', hasAbbreviation: true, description: 'US states and territories' },
      { type: 'canadianProvince', label: 'Canadian Provinces', icon: 'tabler-map', hasAbbreviation: true, description: 'Canadian provinces and territories' },
      { type: 'mexicanState', label: 'Mexican States', icon: 'tabler-map', description: 'Mexican states' },
    ],
  },
  {
    category: 'Referrals',
    icon: 'tabler-share',
    items: [
      { type: 'referralReason', label: 'Referral Reasons', icon: 'tabler-message-share', toggleable: false, description: 'Pre-written referral messages' },
    ],
  },
  {
    category: 'Display Preferences',
    icon: 'tabler-clock',
    items: [
      { type: 'timeIndicator', label: 'Timer Indicator', icon: 'tabler-clock-play', toggleable: false, description: 'Choose how timer notifications appear when tracking time' },
    ],
  },
  {
    category: 'Booking & Lead Gen',
    icon: 'tabler-calendar-event',
    items: [
      { type: 'bookingSetup', label: 'Booking Setup', icon: 'tabler-calendar-event', toggleable: false, description: 'Configure your public booking page, services, form fields, and share link' },
      { type: 'contactMethod', label: 'Contact Methods', icon: 'tabler-address-book', toggleable: false, description: 'Phone, Email, Text, Web — how customers prefer to be contacted', reservedValues: ['Web'] },
      { type: 'faqManager', label: 'FAQ Manager', icon: 'tabler-help-circle', toggleable: false, description: 'Manage FAQ entries for the public site — drag to reorder, use AI to generate' },
    ],
  },
  {
    category: 'Integrations',
    icon: 'tabler-plug-connected',
    items: [
      { type: 'apiKeys', label: 'API Keys', icon: 'tabler-key', toggleable: false, readOnly: false, description: 'Manage API keys for external integrations (Premium feature)' },
    ],
  },
]

// Types that don't use LookupTypeEditor (no item counts)
const SPECIAL_TYPES = new Set(['companyProfile', 'fleetConfig', 'addressFields', 'timeIndicator', 'apiKeys', 'bookingSetup', 'statusDefinition', 'serviceItems', 'customFields', 'faqManager'])

// All lookup types that use LookupTypeEditor
const ALL_LOOKUP_TYPES = LOOKUP_CATALOGUE.flatMap(c => c.items).filter(i => !SPECIAL_TYPES.has(i.type)).map(i => i.type)

// ─── Main View ────────────────────────────────────────────────────────────────
export default function ConfigurationView() {
  const theme = useTheme()
  const router = useRouter()
  const [selected, setSelected] = useState<LookupDef | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    LOOKUP_CATALOGUE.map(cat => cat.category) // Start with all expanded
  )
  const [favorites, setFavorites] = useLocalStorage<string[]>('jm-config-favorites', [])
  const [showFavorites, setShowFavorites] = useLocalStorage<boolean>('jm-config-show-favorites', false)

  // Pre-fetch all lookup counts in parallel to show (xx) in sidebar and header
  const countQueries = useQueries({
    queries: ALL_LOOKUP_TYPES.map(type => ({
      queryKey: ['lookups', type],
      queryFn: () => api.get<Array<{ id: string }>>(`/api/lookups/${type}?activeOnly=false`),
      staleTime: 5 * 60 * 1000,
    }))
  })
  const { data: serviceItemsData } = useQuery<{ id: string }[]>({
    queryKey: ['service-items'],
    queryFn: () => api.get('/api/service-items'),
    staleTime: 5 * 60 * 1000,
  })
  const lookupCounts = useMemo(() => {
    const counts = ALL_LOOKUP_TYPES.reduce((acc, type, idx) => {
      const data = countQueries[idx]?.data
      if (Array.isArray(data)) acc[type] = data.length
      return acc
    }, {} as Record<string, number>)
    if (Array.isArray(serviceItemsData)) counts['serviceItems'] = serviceItemsData.length
    return counts
  }, [countQueries, serviceItemsData])

  const toggleFavorite = (type: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavorites(prev => prev.includes(type) ? prev.filter(f => f !== type) : [...prev, type])
  }

  const visibleCatalogue = showFavorites
    ? LOOKUP_CATALOGUE.map(cat => ({ ...cat, items: cat.items.filter(i => favorites.includes(i.type)) })).filter(cat => cat.items.length > 0)
    : LOOKUP_CATALOGUE

  const activeDef = selected
    ? LOOKUP_CATALOGUE.flatMap(c => c.items).find(i => i.type === selected.type) ?? selected
    : null

  const allExpanded = expandedCategories.length === LOOKUP_CATALOGUE.length
  const allCollapsed = expandedCategories.length === 0

  console.log('Render - allExpanded:', allExpanded, 'Button should show:', allExpanded ? 'Collapse All' : 'Expand All')

  const handleToggleAll = () => {
    console.log('Before toggle - allExpanded:', allExpanded, 'expandedCategories:', expandedCategories.length)
    if (allExpanded) {
      setExpandedCategories([]) // Collapse all
      console.log('Collapsing all')
    } else {
      setExpandedCategories(LOOKUP_CATALOGUE.map(cat => cat.category)) // Expand all
      console.log('Expanding all')
    }
  }

  const handleAccordionChange = (category: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedCategories(prev =>
      isExpanded
        ? [...prev, category]
        : prev.filter(c => c !== category)
    )
  }

  const handleItemClick = (item: LookupDef) => {
    if (item.type === 'apiKeys') {
      router.push('/admin/api-keys')
      return
    }
    setSelected(item)
  }

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
        {/* Header: Favorites pill + Expand/Collapse pill */}
        <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Chip
            label={`Favorites${favorites.length ? ` (${favorites.length})` : ''}`}
            size='small'
            onClick={() => setShowFavorites(v => !v)}
            icon={<i className={showFavorites ? 'tabler-star-filled' : 'tabler-star'} />}
            sx={{
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
              cursor: 'pointer',
              bgcolor: showFavorites ? COLORS.warning : 'action.hover',
              color: showFavorites ? COLORS.white : 'text.secondary',
              '&:hover': { bgcolor: showFavorites ? COLORS.warningDark : 'action.selected' },
              '& .MuiChip-icon': {
                marginLeft: '6px',
                marginRight: '-4px',
                color: showFavorites ? COLORS.white + ' !important' : `${COLORS.warning} !important`,
                fontSize: '0.85rem'
              }
            }}
          />
          <Chip
            key={allExpanded ? 'collapse' : 'expand'}
            label={allExpanded ? 'Collapse All' : 'Expand All'}
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
              color: allExpanded ? COLORS.white : 'primary.main',
              '&:hover': {
                bgcolor: allExpanded ? 'primary.dark' : 'primary.light'
              },
              '& .MuiChip-icon': {
                marginLeft: '6px',
                marginRight: '-4px',
                color: allExpanded ? COLORS.white + ' !important' : 'primary.main !important',
                fontSize: '1rem'
              }
            }}
          />
        </Box>
        <Divider />

        {/* Accordion sections */}
        {visibleCatalogue.map(cat => (
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
                minHeight: 32,
                px: 2,
                py: '2px',
                '&.Mui-expanded': { minHeight: 32 },
                '& .MuiAccordionSummary-content': {
                  margin: '8px 0',
                  '&.Mui-expanded': { margin: '8px 0' }
                }
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
                    onClick={() => handleItemClick(item)}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.25,
                      px: 1.5,
                      py: '2px',
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
                      primary={
                        lookupCounts[item.type] != null
                          ? `${item.label} (${lookupCounts[item.type]})`
                          : item.label
                      }
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontSize: '0.75rem',
                        fontWeight: item.type === selected?.type ? 600 : 400,
                        color: item.type === selected?.type ? 'primary.main' : 'text.primary',
                        noWrap: true,
                      }}
                    />
                    {item.type === 'apiKeys' && (
                      <i className='tabler-crown' style={{ color: COLORS.warningAmber, fontSize: '1.125rem', marginLeft: '0.25rem' }} />
                    )}
                    <Tooltip title={favorites.includes(item.type) ? 'Remove from favorites' : 'Add to favorites'}>
                      <IconButton
                        size='small'
                        onClick={e => toggleFavorite(item.type, e)}
                        sx={{ p: '2px', ml: 0.5, color: favorites.includes(item.type) ? COLORS.warning : 'text.disabled', '&:hover': { color: COLORS.warning } }}
                      >
                        <i className={favorites.includes(item.type) ? 'tabler-star-filled text-sm' : 'tabler-star text-sm'} />
                      </IconButton>
                    </Tooltip>
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
                {!activeDef.readOnly && activeDef.type !== 'companyProfile' && ' · Click a name to edit inline · Drag to reorder'}
              </Typography>
            </Box>

            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className={`${activeDef.icon} text-xl`} style={{ color: 'var(--mui-palette-primary-main)' }} />
                    <Typography variant='subtitle1' fontWeight={600}>
                      {activeDef.label}
                      {lookupCounts[activeDef.type] != null && (
                        <Typography component='span' variant='body2' color='text.secondary' sx={{ ml: 0.75 }}>
                          ({lookupCounts[activeDef.type]})
                        </Typography>
                      )}
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
                {activeDef.type === 'companyProfile' ? (
                  <CompanyView />
                ) : activeDef.type === 'fleetConfig' ? (
                  <FleetConfigEditor />
                ) : activeDef.type === 'addressFields' ? (
                  <AddressFieldsEditor />
                ) : activeDef.type === 'timeIndicator' ? (
                  <TimeIndicatorEditor />
                ) : activeDef.type === 'bookingSetup' ? (
                  <BookingSetupEditor />
                ) : activeDef.type === 'statusDefinition' ? (
                  <StatusDefinitionEditor />
                ) : activeDef.type === 'serviceItems' ? (
                  <ServiceItemsEditor />
                ) : activeDef.type === 'customFields' ? (
                  <CustomFieldsEditor entityType='' entityLabel='' />
                ) : activeDef.type === 'faqManager' ? (
                  <FaqEditor />
                ) : (
                  <LookupTypeEditor
                    key={activeDef.type}
                    lookupType={activeDef.type}
                    title={activeDef.label}
                    toggleable={activeDef.toggleable ?? true}
                    hasAbbreviation={activeDef.hasAbbreviation ?? false}
                    isColorSwatch={activeDef.isColorSwatch ?? false}
                    readOnly={activeDef.readOnly ?? false}
                    reservedValues={activeDef.reservedValues}
                  />
                )}
              </CardContent>
            </Card>

            {activeDef.type !== 'companyProfile' && activeDef.type !== 'fleetConfig' && activeDef.type !== 'addressFields' && activeDef.type !== 'timeIndicator' && (
              <Typography variant='caption' color='text.disabled' sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
                Changes are saved automatically
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
