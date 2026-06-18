'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Paper, { PaperProps } from '@mui/material/Paper'
import Draggable from 'react-draggable'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Switch from '@mui/material/Switch'
import Accordion from '@mui/material/Accordion'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import CircularProgress from '@mui/material/CircularProgress'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import useLocalStorage from '@/hooks/useLocalStorage'

import SectionHeader from '@/components/SectionHeader'
import AuditFooter from '@/components/AuditFooter'
import ContactLink from '@/components/ContactLink'
import PhotoGallerySection from '@/components/PhotoGallerySection'
import CustomAvatar from '@core/components/mui/Avatar'
import { getInitials } from '@/utils/getInitials'
import ClientEditPanel from './ClientEditPanel'
import ClientHistoryPanel from './ClientHistoryPanel'
import CustomFieldsDisplaySection from '@/components/CustomFieldsDisplaySection'

import type { Client, Request, Quote, Job, Invoice } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


type CustomerTypeColor = {
  [key: string]: 'primary' | 'success' | 'warning' | 'info' | 'error' | 'secondary'
}

const customerTypeColors: CustomerTypeColor = {
  Residential: 'primary',
  Commercial: 'success',
  Industrial: 'warning'
}

interface Props {
  open: boolean
  onClose: () => void
  onEdit: () => void
  clientId?: string | null
  client?: Client
  initialEditing?: boolean
  requests?: Request[]
  quotes?: Quote[]
  jobs?: Job[]
  invoices?: Invoice[]
}

const FieldDisplay = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body1" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  )
}

function PaperComponent(props: PaperProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  return (
    <Draggable nodeRef={nodeRef as any} handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} ref={nodeRef} style={{ pointerEvents: 'auto' }} />
    </Draggable>
  )
}

const SortableTab = ({ id, label, count, isActive, onClick }: { id: string, label: string, count: number, isActive: boolean, onClick: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
    touchAction: 'none'
  }
  
  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      sx={{
        px: 3, 
        py: 1, 
        borderRadius: '500px',
        bgcolor: isActive ? 'primary.main' : 'background.paper',
        color: isActive ? 'primary.contrastText' : 'text.primary',
        border: 1,
        borderColor: isActive ? 'primary.main' : 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        transition: 'all 0.2s',
        userSelect: 'none',
        '&:active': { cursor: 'grabbing' },
        '&:hover': {
          bgcolor: isActive ? 'primary.dark' : 'action.hover'
        }
      }}
    >
      <Typography variant="body1" fontWeight={600}>{label}</Typography>
      <Box sx={{ 
        bgcolor: isActive ? 'rgba(255,255,255,0.2)' : 'action.selected', 
        px: 1, 
        borderRadius: 1,
        color: isActive ? 'inherit' : 'text.secondary'
      }}>
        <Typography variant="body2" fontWeight={700}>{count}</Typography>
      </Box>
    </Box>
  )
}

/**
 * Full-page client detail view with tabs for info, addresses, phones, emails, photos, and history.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/clients/ClientFullPageDetail.tsx
 */
export default function ClientFullPageDetail({
  open, onClose, onEdit, clientId, client, initialEditing, requests, quotes, jobs, invoices
}: Props) {
  const router = useRouter()

  // Self-fetch when clientId is provided but client data is not
  const { data: fetchedClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => api.get<Client>(`/api/clients/${clientId}`),
    enabled: !!clientId && !client && open
  })
  const { data: fetchedRequests } = useQuery({
    queryKey: ['requests', { clientId }],
    queryFn: () => api.get<Request[]>(`/api/requests?clientId=${clientId}`),
    enabled: !!clientId && !requests && open
  })
  const { data: fetchedQuotes } = useQuery({
    queryKey: ['quotes', { clientId }],
    queryFn: () => api.get<Quote[]>(`/api/quotes?clientId=${clientId}`),
    enabled: !!clientId && !quotes && open
  })
  const { data: fetchedJobs } = useQuery({
    queryKey: ['jobs', { clientId }],
    queryFn: () => api.get<Job[]>(`/api/jobs?clientId=${clientId}`),
    enabled: !!clientId && !jobs && open
  })
  const { data: fetchedInvoices } = useQuery({
    queryKey: ['invoices', { clientId }],
    queryFn: () => api.get<Invoice[]>(`/api/invoices?clientId=${clientId}`),
    enabled: !!clientId && !invoices && open
  })

  const resolvedClient = client || fetchedClient
  const resolvedRequests = requests || fetchedRequests || []
  const resolvedQuotes = quotes || fetchedQuotes || []
  const resolvedJobs = jobs || fetchedJobs || []
  const resolvedInvoices = invoices || fetchedInvoices || []

  // Normalize arrays because API may return paginated `{ data: [...] }` objects
  const reqList = Array.isArray(resolvedRequests) ? resolvedRequests : ((resolvedRequests as any)?.data || [])
  const quoteList = Array.isArray(resolvedQuotes) ? resolvedQuotes : ((resolvedQuotes as any)?.data || [])
  const jobList = Array.isArray(resolvedJobs) ? resolvedJobs : ((resolvedJobs as any)?.data || [])
  const invoiceList = Array.isArray(resolvedInvoices) ? resolvedInvoices : ((resolvedInvoices as any)?.data || [])

  // Tab configuration
  const initialTabs = [
    { id: 'addresses', label: 'Addresses' },
    { id: 'phones', label: 'Phones' },
    { id: 'emails', label: 'Emails' },
  ]
  const [tabOrder, setTabOrder] = useLocalStorage('client-detail-tabs-order', initialTabs)
  const [activeTabId, setActiveTabId] = useState<string>(tabOrder[0]?.id || 'addresses')

  // Edit/Delete State Management
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(initialEditing ?? false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const saveFuncRef = useRef<(() => void) | undefined>(undefined)
  const [editState, setEditState] = useState({ isSaving: false, isValid: true })
  useEffect(() => {
    if (!isEditing) setEditState({ isSaving: false, isValid: true })
  }, [isEditing])
  const [printing, setPrinting] = useState(false)

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/reports/client/${resolvedClient?.id}?format=pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jm_token')}`
        }
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const blob = await response.blob()
      const pdfBlob = new Blob([blob], { type: 'application/pdf' })
      const previewUrl = window.URL.createObjectURL(pdfBlob)
      window.open(previewUrl, '_blank')
    } catch (error) {
      console.error('Print failed:', error)
      alert('Failed to generate report.')
    } finally {
      setPrinting(false)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/clients/${resolvedClient?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onClose()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      if (error?.response?.status === 409 && errorData?.error) {
        alert(errorData.error)
      } else {
        alert('Failed to delete client.')
      }
    }
  })

  const handleDelete = () => {
    deleteMutation.mutate()
    setDeleteDialogOpen(false)
  }

  const handleInlineSave = () => {
    if (saveFuncRef.current) saveFuncRef.current()
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setTabOrder((items: typeof initialTabs) => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

    const [expandedSections, setExpandedSections] = useState({
    gallery: false,
    requests: false,
    quotes: false,
    jobs: false,
    invoices: false,
    history: false
  })

  // Has to be below state init
  const allExpanded = expandedSections.requests && expandedSections.quotes && expandedSections.jobs && expandedSections.invoices && expandedSections.history;

  const handleToggleExpandAll = () => {
    const val = !allExpanded;
    setExpandedSections(p => ({ ...p, requests: val, quotes: val, jobs: val, invoices: val, history: val }));
  };

  // Build display names
  const personName = [resolvedClient?.prefix, resolvedClient?.firstName, resolvedClient?.lastName, resolvedClient?.suffix].filter(Boolean).join(' ')
  const primaryName = resolvedClient?.useCompanyName && resolvedClient?.company ? resolvedClient.company : personName

  return (
    <Dialog 
      open={open} 
      onClose={() => (isEditing && resolvedClient) ? setIsEditing(false) : onClose()}
      maxWidth={false}
      hideBackdrop
      disableScrollLock
      disableEnforceFocus
      transitionDuration={0}
      PaperComponent={PaperComponent}
      sx={{ pointerEvents: 'none' }}
      PaperProps={{
        sx: {
          width: '60vw',
          maxWidth: 'none',
          height: '90vh',
          maxHeight: 'none',
          m: 0,
          borderRadius: 2
        }
      }}
    >
      {/* HEADER */}
      <DialogTitle id="draggable-dialog-title" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
        <Box className="flex items-center gap-3">
          <CustomAvatar
            size={50}
            skin='light'
            color={customerTypeColors[resolvedClient?.customerType ?? ''] || 'secondary'}
            sx={{ fontSize: '1.5rem', letterSpacing: '0.15em', fontWeight: 600 }}
          >
            {getInitials([resolvedClient?.firstName, resolvedClient?.lastName].filter(Boolean).join(' '))}
          </CustomAvatar>
          <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '0.05em', wordSpacing: '0.15em' }}>
            {!resolvedClient ? 'Add Client' : isEditing ? 'Edit Client' : (personName || 'Client Details')}
          </Typography>
        </Box>
        <Box className="flex items-center gap-2">
          {isEditing ? (
            <>
              {resolvedClient && (
                <Tooltip title="Delete Client">
                  <IconButton
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={editState.isSaving}
                    sx={{ color: 'error.main', bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}
                  >
                    <i className="tabler-trash text-[28px]" />
                  </IconButton>
                </Tooltip>
              )}
              <Button
                variant="outlined"
                onClick={() => resolvedClient ? setIsEditing(false) : onClose()}
                disabled={editState.isSaving}
                sx={{ borderRadius: '8px' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleInlineSave}
                disabled={editState.isSaving}
                sx={{ borderRadius: '8px', minWidth: '80px' }}
              >
                {editState.isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Tooltip title="Print Report">
                <IconButton onClick={handlePrint} disabled={printing} sx={{ bgcolor: 'info.lighter', color: 'info.main', '&:hover': { bgcolor: 'info.light' } }}>
                  {printing ? <CircularProgress size={24} color="inherit" /> : <i className="tabler-printer text-[24px]" />}
                </IconButton>
              </Tooltip>
              <IconButton onClick={() => setIsEditing(true)} sx={{ bgcolor: 'primary.lighter', color: 'primary.main', '&:hover': { bgcolor: 'primary.light' } }}>
                <i className="tabler-pencil text-[28px]" />
              </IconButton>
            </>
          )}
          <IconButton onClick={() => (isEditing && resolvedClient) ? setIsEditing(false) : onClose()} disabled={editState.isSaving}>
            <i className="tabler-x" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* CONTENT (Resizable Panels) */}
      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <ClientEditPanel
            clientId={resolvedClient?.id || null}
            open={true}
            onClose={() => resolvedClient ? setIsEditing(false) : onClose()}
            onSaved={() => resolvedClient ? setIsEditing(false) : onClose()}
            inline={true}
            registerSave={(fn) => { saveFuncRef.current = fn }}
            onStateChange={setEditState}
          />
        ) : resolvedClient ? (
          <PanelGroup direction="horizontal">
            
            {/* LEFT SECTION (70%) */}
          <Panel defaultSize={70} minSize={40}>
            <PanelGroup direction="vertical">
              
              {/* TOP LEFT (Client Details) */}
              <Panel defaultSize={60} minSize={30} className="overflow-y-auto bg-backgroundPaper">
                <Box sx={{ p: 4 }}>
                  <SectionHeader>Client Details</SectionHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <FieldDisplay label="Company" value={resolvedClient.company} />
                      {(() => {
                        const addr = resolvedClient.addresses?.find((a: any) => a.isDefault) || resolvedClient.addresses?.[0]
                        const location = [addr?.city, addr?.state].filter(Boolean).join(', ')
                        return location ? (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body1" color="text.secondary" display="block">
                              Location
                            </Typography>
                            <Typography sx={{ fontSize: '1.25rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <i className="tabler-map-pin text-[20px]" />
                              {location}
                            </Typography>
                          </Box>
                        ) : null
                      })()}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body1" color="text.secondary" display="block">
                          Credit Status
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight={500} sx={{ fontSize: '1.15rem' }}>
                            {resolvedClient.creditStatus || '-'}
                          </Typography>
                          {resolvedClient.creditStatus && (
                            resolvedClient.creditStatus.toLowerCase().includes('good') || resolvedClient.creditStatus.toLowerCase().includes('active') ? (
                              <i className="tabler-thumb-up text-success text-[20px]" />
                            ) : resolvedClient.creditStatus.toLowerCase().includes('hold') || resolvedClient.creditStatus.toLowerCase().includes('suspend') || resolvedClient.creditStatus.toLowerCase().includes('bad') ? (
                              <i className="tabler-thumb-down text-error text-[20px]" />
                            ) : null
                          )}
                        </Box>
                      </Box>
                      {resolvedClient.webUrl && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body1" color="text.secondary" display="block">
                            Website
                          </Typography>
                          <Typography sx={{ fontSize: '1.4rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <a href={resolvedClient.webUrl.startsWith('http') ? resolvedClient.webUrl : `https://${resolvedClient.webUrl}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary-main hover:underline text-primary-main">
                              {resolvedClient.webUrl}
                            </a>
                            <IconButton
                              size="small"
                              onClick={() => window.open(resolvedClient.webUrl?.startsWith('http') ? resolvedClient.webUrl : `https://${resolvedClient.webUrl}`, '_blank')}
                              sx={{ p: 0.5 }}
                            >
                              <i className="tabler-external-link text-[24px]" />
                            </IconButton>
                          </Typography>
                        </Box>
                      )}
                      <FieldDisplay label="Role" value={resolvedClient.role} />
                    </div>
                    <div>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body1" color="text.secondary" display="block">
                          Customer Type
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label={resolvedClient.customerType || 'None'}
                            variant="tonal"
                            color={customerTypeColors[resolvedClient.customerType ?? ''] || 'secondary'}
                            sx={{ fontSize: '1.15rem', fontWeight: 500, py: 2, px: 1, height: '36px', borderRadius: '18px', textTransform: 'capitalize' }}
                          />
                        </Box>
                      </Box>
                      <FieldDisplay label="Payment Terms" value={resolvedClient.paymentTerms} />
                      <FieldDisplay label="Tax Code" value={resolvedClient.taxCode} />
                      <FieldDisplay label="Tags" value={resolvedClient.tags} />
                      {resolvedClient.dateOfBirth && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body1" color="text.secondary" display="block">
                            Date of Birth
                          </Typography>
                          <Typography sx={{ fontSize: '1.25rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <i className="tabler-cake text-[20px]" />
                            {new Date(resolvedClient.dateOfBirth + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </Typography>
                        </Box>
                      )}
                    </div>
                  </div>

                  {resolvedClient.notes && (
                    <Box sx={{ mt: 4 }}>
                      <SectionHeader>Technician Notes</SectionHeader>
                      <Box sx={{ p: 3, bgcolor: 'info.lighter', border: 1, borderColor: 'info.main', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {resolvedClient.notes}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {resolvedClient.internalNotes && (
                    <Box sx={{ mt: 4 }}>
                      <SectionHeader>Internal Notes (Admin Only)</SectionHeader>
                      <Box sx={{ p: 3, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {resolvedClient.internalNotes}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Custom Fields */}
                  <CustomFieldsDisplaySection
                    entityType='client'
                    customFields={resolvedClient.customFields}
                  />

                  <Box sx={{ mt: 4 }}>
                    <PhotoGallerySection entityId={resolvedClient.id} entityType="client" />
                  </Box>
                </Box>
              </Panel>

              {/* HORIZONTAL SPLITTER */}
              <PanelResizeHandle className="h-2 bg-gray-200 border-y border-gray-300 cursor-row-resize flex items-center justify-center transition-colors hover:bg-primary-light relative z-10">
                <div className="w-8 h-0.5 bg-gray-400 rounded-full" />
              </PanelResizeHandle>

              {/* BOTTOM LEFT (Tabs) */}
              <Panel defaultSize={40} minSize={20} className="overflow-y-auto flex flex-col bg-backgroundPaper">
<Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }} className="bg-backgroundDefault">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tabOrder.map((t: any) => t.id)} strategy={horizontalListSortingStrategy}>
                  <Box className="flex items-center gap-3">
                    {tabOrder.map((tab: any) => {
                      const count = tab.id === 'addresses' ? (resolvedClient.addresses?.length || 0) :
                                    tab.id === 'phones' ? (resolvedClient.phoneNumbers?.length || 0) :
                                    (resolvedClient.emails?.length || 0)
                      return (
                        <SortableTab 
                          key={tab.id} 
                          id={tab.id} 
                          label={tab.label} 
                          count={count}
                          isActive={activeTabId === tab.id}
                          onClick={() => setActiveTabId(tab.id)}
                        />
                      )
                    })}
                  </Box>
                </SortableContext>
              </DndContext>
            </Box>
            
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: 'background.paper' }}>
              {activeTabId === 'addresses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(resolvedClient.addresses || []).map((addr: any) => (
                    <Box key={addr.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                      <Box className="flex items-center justify-between mb-2">
                        <Box className="flex items-center gap-2">
                          {addr.isDefault && <i className="tabler-star-filled text-sm" style={{ color: COLORS.warning }} />}
                          {addr.addressType && addr.addressType.toUpperCase() !== 'ADDRESS' && (
                            <Typography variant="body2" fontWeight={600} color="primary" sx={{ textTransform: 'uppercase' }}>
                              {addr.addressType}
                            </Typography>
                          )}
                        </Box>
                        <Box className="flex items-center gap-1">
                          <Tooltip title="Weather">
                            <IconButton size="small" sx={{ p: 0.5 }} onClick={() => window.open(`https://weather.com/weather/today/l/${addr.zipCode}`, '_blank')}>
                              <i className="tabler-cloud text-[20px]" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Google Earth">
                            <IconButton size="small" sx={{ p: 0.5 }} onClick={() => window.open(`https://earth.google.com/web/search/${encodeURIComponent(`${addr.street} ${addr.city} ${addr.state} ${addr.zipCode}`)}`, '_blank')}>
                              <i className="tabler-world text-[20px]" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Google Maps">
                            <IconButton size="small" sx={{ p: 0.5 }} onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(`${addr.street} ${addr.city} ${addr.state} ${addr.zipCode}`)}`, '_blank')}>
                              <i className="tabler-map-pin text-[20px]" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: '1.15rem', lineHeight: 1.5, fontWeight: 500, color: 'text.primary' }}>{addr.street}</Typography>
                      {addr.street2 && <Typography sx={{ fontSize: '1.15rem', lineHeight: 1.5, fontWeight: 500, color: 'text.primary' }}>{addr.street2}</Typography>}
                      <Typography sx={{ fontSize: '1.15rem', lineHeight: 1.5, fontWeight: 500, color: 'text.primary' }}>{addr.city}, {addr.state} {addr.zipCode}</Typography>
                    </Box>
                  ))}
                </div>
              )}

              {activeTabId === 'phones' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {(resolvedClient?.phoneNumbers || []).map((ph: any) => (
                    <Box key={ph.id} sx={{ px: 1.5, py: 1, border: 1, borderColor: 'divider', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      {ph.isDefault && <i className="tabler-star-filled text-sm flex-shrink-0" style={{ color: COLORS.warning }} />}
                      <a href={`tel:${ph.number}`} className="text-base font-semibold text-primary underline hover:text-primary-dark whitespace-nowrap flex-shrink-0">
                        {ph.number}
                      </a>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {ph.customLabel || ph.type}
                      </Typography>
                    </Box>
                  ))}
                </div>
              )}

              {activeTabId === 'emails' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {(resolvedClient?.emails || []).map((em: any) => (
                    <Box key={em.id} sx={{ px: 1.5, py: 1, border: 1, borderColor: 'divider', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      {em.isDefault && <i className="tabler-star-filled text-sm flex-shrink-0" style={{ color: COLORS.warning }} />}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <ContactLink type="email" value={em.address} className="!text-base !font-semibold !text-primary !underline hover:!text-primary-dark !block !truncate" />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {em.customLabel || em.type}
                      </Typography>
                    </Box>
                  ))}
                </div>
              )}
            </Box>

</Panel>
            </PanelGroup>
          </Panel>

          {/* VERTICAL SPLITTER */}
          <PanelResizeHandle className="w-2 bg-gray-100 border-x border-gray-200 cursor-col-resize flex items-center justify-center transition-colors hover:bg-primary-light">
            <div className="h-8 w-0.5 bg-gray-400 rounded-full" />
          </PanelResizeHandle>

          {/* RIGHT SECTION (30%) */}
          <Panel defaultSize={30} minSize={20} className="bg-gray-50 flex flex-col border-l border-divider">
            <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Box>
                  <SectionHeader>Actions</SectionHeader>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Button variant="contained" size="large" startIcon={<i className="tabler-clipboard-list" />} onClick={() => router.push(`/requests?add=1&clientId=${resolvedClient.id}${resolvedClient.taxCodeId ? `&taxCodeId=${resolvedClient.taxCodeId}` : ''}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-request)', '&:hover': { bgcolor: 'var(--color-action-request-hover)' } }}>
                      Create Request
                    </Button>
                    <Button variant="contained" size="large" startIcon={<i className="tabler-file-text" />} onClick={() => router.push(`/quotes?add=1&clientId=${resolvedClient.id}${resolvedClient.taxCodeId ? `&taxCodeId=${resolvedClient.taxCodeId}` : ''}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-quote)', '&:hover': { bgcolor: 'var(--color-action-quote-hover)' } }}>
                      Create Quote
                    </Button>
                    <Button variant="contained" size="large" startIcon={<i className="tabler-briefcase" />} onClick={() => router.push(`/jobs?add=1&clientId=${resolvedClient.id}${resolvedClient.taxCodeId ? `&taxCodeId=${resolvedClient.taxCodeId}` : ''}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-job)', '&:hover': { bgcolor: 'var(--color-action-job-hover)' } }}>
                      Create Job
                    </Button>
                    <Button variant="contained" size="large" startIcon={<i className="tabler-receipt" />} onClick={() => router.push(`/invoices?add=1&clientId=${resolvedClient.id}${resolvedClient.taxCodeId ? `&taxCodeId=${resolvedClient.taxCodeId}` : ''}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-invoice)', '&:hover': { bgcolor: 'var(--color-action-invoice-hover)' } }}>
                      Create Invoice
                    </Button>
                  </Box>
                </Box>

                <Box>
                  <Accordion expanded={expandedSections.gallery} onChange={() => setExpandedSections(p => ({ ...p, gallery: !p.gallery }))} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                    <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ p: 0, minHeight: 'auto', '& .MuiAccordionSummary-content': { my: 0 } }}>
                       <SectionHeader>Gallery</SectionHeader>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0, pt: 2 }}>
                      <PhotoGallerySection entityId={resolvedClient.id} entityType="client" />
                    </AccordionDetails>
                  </Accordion>
                </Box>

                <Box>
                  <Box className="flex items-center justify-between mb-4 mt-2">
                    <SectionHeader>Related Items</SectionHeader>
                    <Chip 
                      label={allExpanded ? "Collapse All" : "Expand All"} 
                      onClick={handleToggleExpandAll} 
                      size="medium" 
                      variant="filled" 
                      color="primary" 
                      className="cursor-pointer font-medium" 
                      sx={{ fontWeight: "bold" }}
                    />
                  </Box>
                  
                  {/* Requests Accordion */}
                  <Accordion expanded={expandedSections.requests} onChange={() => setExpandedSections(p => ({ ...p, requests: !p.requests }))} sx={{ mb: 1, bgcolor: 'background.paper' }}>
                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                      <Typography variant="subtitle1" fontWeight={700} fontSize="1.1rem">Requests ({reqList.length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      {reqList.map((r: any) => (
                        <Box key={r.id} onClick={() => router.push(`/requests?edit=${r.id}`)} className="flex items-center gap-3 px-3 py-2 cursor-pointer border-t border-divider hover:bg-action-hover">
                          <i className='tabler-clipboard-list text-md' />
                          <Box className='flex-1'>
                            <Typography variant="body1" fontWeight={600} noWrap>{r.title}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>

                  {/* Quotes Accordion */}
                  <Accordion expanded={expandedSections.quotes} onChange={() => setExpandedSections(p => ({ ...p, quotes: !p.quotes }))} sx={{ mb: 1, bgcolor: 'background.paper' }}>
                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                      <Typography variant="subtitle1" fontWeight={700} fontSize="1.1rem">Quotes ({quoteList.length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      {quoteList.map((q: any) => (
                        <Box key={q.id} onClick={() => router.push(`/quotes?edit=${q.id}`)} className="flex items-center gap-3 px-3 py-2 cursor-pointer border-t border-divider hover:bg-action-hover">
                          <i className='tabler-file-text text-md' />
                          <Box className='flex-1'>
                            <Typography variant="body1" fontWeight={600}>{q.quoteNumber}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>

                  {/* Jobs Accordion */}
                  <Accordion expanded={expandedSections.jobs} onChange={() => setExpandedSections(p => ({ ...p, jobs: !p.jobs }))} sx={{ mb: 1, bgcolor: 'background.paper' }}>
                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                      <Typography variant="subtitle1" fontWeight={700} fontSize="1.1rem">Jobs ({jobList.length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      {jobList.map((j: any) => (
                        <Box key={j.id} onClick={() => router.push(`/jobs?edit=${j.id}`)} className="flex items-center gap-3 px-3 py-2 cursor-pointer border-t border-divider hover:bg-action-hover">
                          <i className='tabler-briefcase text-md' />
                          <Box className='flex-1'>
                            <Typography variant="body1" fontWeight={600} noWrap>{j.title}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                  
                  {/* Invoices Accordion */}
                  <Accordion expanded={expandedSections.invoices} onChange={() => setExpandedSections(p => ({ ...p, invoices: !p.invoices }))} sx={{ mb: 1, bgcolor: 'background.paper' }}>
                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                      <Typography variant="subtitle1" fontWeight={700} fontSize="1.1rem">Invoices ({invoiceList.length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      {invoiceList.map((inv: any) => (
                        <Box key={inv.id} onClick={() => router.push(`/invoices?edit=${inv.id}`)} className="flex items-center gap-3 px-3 py-2 cursor-pointer border-t border-divider hover:bg-action-hover">
                          <i className='tabler-receipt text-md' />
                          <Box className='flex-1'>
                            <Typography variant="body1" fontWeight={600}>{inv.invoiceNumber}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>

                  {/* History Accordion */}
                  <Accordion expanded={expandedSections.history} onChange={() => setExpandedSections(p => ({ ...p, history: !p.history }))} sx={{ mb: 1, bgcolor: 'background.paper' }}>
                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                      <Typography variant="subtitle1" fontWeight={700} fontSize="1.1rem" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className='tabler-history text-lg' style={{ color: 'var(--mui-palette-text-secondary)' }} />
                        Activity History
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      {expandedSections.history && <ClientHistoryPanel clientId={resolvedClient.id} />}
                    </AccordionDetails>
                  </Accordion>
                </Box>
              </Box>
            </Box>

          </Panel>
        </PanelGroup>
        ) : null}
      </DialogContent>

      {/* FIXED FOOTER CONTROLS */}
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'center' }}>
        <AuditFooter creAt={resolvedClient?.creAt} creBy={resolvedClient?.creBy} modAt={resolvedClient?.modAt} modBy={resolvedClient?.modBy} divider={false} />
      </DialogActions>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        disableEnforceFocus
        PaperProps={{ sx: { minWidth: 400 } }}
      >
        <DialogTitle id="alert-dialog-title">
          Delete Client?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this client? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" autoFocus disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}
