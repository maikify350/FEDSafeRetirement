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
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'

import AuditFooter from '@/components/AuditFooter'
import SectionHeader from '@/components/SectionHeader'
import PhotoGallerySection from '@/components/PhotoGallerySection'
import { fmtStatus } from '@/utils/formatStatus'
import JobEditPanel from './JobEditPanel'
import EntityHistoryPanel from '@/components/EntityHistoryPanel'

import type { Job, Invoice } from '@shared/contracts'

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'error' | 'success' | 'secondary' | 'primary'> = {
  unscheduled: 'error', scheduled: 'info', in_progress: 'warning', on_hold: 'error', completed: 'success', cancelled: 'secondary',
}

const fmtDate = (s: string | null | undefined) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtMoney = (n: number | null | undefined) => n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—'

interface Props {
  open: boolean
  onClose: () => void
  onEdit: () => void
  job?: Job
  jobId?: string | null
  initialEditing?: boolean
  initialClientId?: string | null
  initialQuoteId?: string | null
  initialRequestId?: string | null
  initialTaxCodeId?: string | null
  invoices?: Invoice[]
}

function PaperComponent(props: PaperProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  return (
    <Draggable nodeRef={nodeRef as any} handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} ref={nodeRef} style={{ pointerEvents: 'auto' }} />
    </Draggable>
  )
}

/**
 * Full-page job detail view with line items, checklist, scheduling, photos, and linked entities.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/jobs/JobFullPageDetail.tsx
 */
export default function JobFullPageDetail({ open, onClose, onEdit, job, jobId, initialEditing, initialClientId, initialQuoteId, initialRequestId, initialTaxCodeId, invoices }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Self-fetch when jobId is provided but job is not
  const { data: fetchedJob } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get<Job>(`/api/jobs/${jobId}`),
    enabled: !!jobId && !job
  })
  const { data: fetchedInvoices } = useQuery({
    queryKey: ['invoices', { jobId }],
    queryFn: () => api.get<Invoice[]>(`/api/invoices?jobId=${jobId}`),
    enabled: !!jobId && !invoices
  })
  const resolvedJob = job || fetchedJob
  const resolvedInvoices = invoices || fetchedInvoices || []

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
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
      const response = await fetch(`${BACKEND}/api/reports/job/${resolvedJob?.id}?format=pdf`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jm_token')}` }
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const blob = await response.blob()
      window.open(window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })), '_blank')
    } catch (error) {
      console.error('Print failed:', error)
      alert('Failed to generate report.')
    } finally {
      setPrinting(false)
    }
  }

  const [expandedSections, setExpandedSections] = useState({
    lineItems: false,
    gallery: false,
    invoices: false,
    history: false
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/jobs/${resolvedJob?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onClose()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      if (error?.response?.status === 409 && errorData?.error) {
        alert(errorData.error)
      } else {
        alert('Failed to delete job.')
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

  const clientName = resolvedJob?.client ? (resolvedJob.client.useCompanyName && resolvedJob.client.company ? resolvedJob.client.company : `${resolvedJob.client.firstName || ''} ${resolvedJob.client.lastName || ''}`.trim()) : null

  const isUnscheduled = resolvedJob?.status === 'scheduled' && !resolvedJob?.scheduledDate
  const statusKey = (resolvedJob?.status || '').toLowerCase().replace(' ', '_')
  const statusColor = isUnscheduled ? 'error' : (STATUS_COLORS[statusKey] ?? 'secondary')

  return (
    <Dialog
      open={open}
      onClose={() => (isEditing && resolvedJob) ? setIsEditing(false) : onClose()}
      maxWidth={false}
      hideBackdrop
      disableScrollLock
      disableEnforceFocus
      transitionDuration={0}
      PaperComponent={PaperComponent}
      sx={{ pointerEvents: 'none' }}
      PaperProps={{
        sx: { width: '60vw', maxWidth: 'none', height: '90vh', maxHeight: 'none', m: 0, borderRadius: 2 }
      }}
    >
      {/* HEADER */}
      <DialogTitle id="draggable-dialog-title" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
        <Box className="flex items-center gap-3">
          <Box className="flex flex-col">
            <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '0.05em', wordSpacing: '0.15em' }}>
              {!resolvedJob ? 'Add Job' : isEditing ? 'Edit Job' : (resolvedJob.jobNumber ? `Job ${resolvedJob.jobNumber}` : 'Job Details')}
            </Typography>
            <Box className="flex items-center gap-2 mt-0.5">
              {resolvedJob?.status && <Chip label={isUnscheduled ? 'Unscheduled' : fmtStatus(resolvedJob.status)} size='small' color={statusColor} variant='tonal' />}
              {resolvedJob?.priority && <Chip label={resolvedJob.priority} size='small' variant='outlined' color={({ low: 'default', normal: 'info', high: 'warning', urgent: 'error' } as any)[resolvedJob.priority] || 'default'} />}
              {(resolvedJob?.client as any)?.customerType && (
                <Chip
                  icon={<i className={(resolvedJob.client as any).customerType.toLowerCase() === 'residential' ? 'tabler-home text-sm' : 'tabler-building text-sm'} />}
                  label={(resolvedJob.client as any).customerType}
                  size='small'
                  variant='tonal'
                  color={(resolvedJob.client as any).customerType.toLowerCase() === 'residential' ? 'info' : 'warning'}
                />
              )}
            </Box>
          </Box>
        </Box>
        <Box className="flex items-center gap-2">
          {isEditing ? (
            <>
              {resolvedJob && (
                <Tooltip title="Delete Job">
                  <IconButton onClick={() => setDeleteDialogOpen(true)} disabled={editState.isSaving} sx={{ color: 'error.main', bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}>
                    <i className="tabler-trash text-[28px]" />
                  </IconButton>
                </Tooltip>
              )}
              <Button variant="outlined" onClick={() => resolvedJob ? setIsEditing(false) : onClose()} disabled={editState.isSaving} sx={{ borderRadius: '8px' }}>Cancel</Button>
              <Button variant="contained" onClick={handleInlineSave} disabled={editState.isSaving} sx={{ borderRadius: '8px', minWidth: '80px' }}>
                {editState.isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Tooltip title="Print Report">
                <IconButton onClick={handlePrint} disabled={printing} sx={{ bgcolor: 'info.lighter', color: 'info.main', '&:hover': { bgcolor: 'info.light' } }}>
                  {printing ? <CircularProgress size={24} color='inherit' /> : <i className='tabler-printer text-[24px]' />}
                </IconButton>
              </Tooltip>
              <IconButton onClick={() => setIsEditing(true)} sx={{ bgcolor: 'primary.lighter', color: 'primary.main', '&:hover': { bgcolor: 'primary.light' } }}>
                <i className="tabler-pencil text-[28px]" />
              </IconButton>
            </>
          )}
          <IconButton onClick={() => (isEditing && resolvedJob) ? setIsEditing(false) : onClose()} disabled={editState.isSaving}>
            <i className="tabler-x" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* CONTENT (Resizable Panels) */}
      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <JobEditPanel
            jobId={resolvedJob?.id || null}
            open={true}
            onClose={() => { if (!resolvedJob) onClose(); else setIsEditing(false) }}
            onSaved={() => { if (!resolvedJob) onClose(); else setIsEditing(false) }}
            inline={true}
            registerSave={(fn: any) => { saveFuncRef.current = fn }}
            onStateChange={setEditState}
            initialClientId={initialClientId}
            initialQuoteId={initialQuoteId}
            initialRequestId={initialRequestId}
            initialTaxCodeId={initialTaxCodeId}
          />
        ) : resolvedJob ? (
          <PanelGroup direction="horizontal">
            {/* LEFT SECTION (70%) */}
            <Panel defaultSize={70} minSize={40}>
              <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
                <SectionHeader>Job Information</SectionHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" color="text.secondary" display="block">Title</Typography>
                      <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>{resolvedJob.title}</Typography>
                    </Box>
                    {clientName && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body1" color="text.secondary" display="block">Client</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className='tabler-user text-primary text-[20px]' />
                          <Typography sx={{ fontSize: '1.25rem', fontWeight: 500, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => router.push(`/clients?edit=${resolvedJob.clientId}`)}>
                            {clientName}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" color="text.secondary" display="block">Assigned To</Typography>
                      <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>{resolvedJob.assignedTo?.name || '—'}</Typography>
                    </Box>
                  </div>
                  <div>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" color="text.secondary" display="block">Scheduled Date</Typography>
                      <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>{fmtDate(resolvedJob.scheduledDate)}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" color="text.secondary" display="block">Needed By (Deadline)</Typography>
                      <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>{fmtDate((resolvedJob as any).neededBy)}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" color="text.secondary" display="block">Completed At</Typography>
                      <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>{fmtDate((resolvedJob as any).completedAt)}</Typography>
                    </Box>
                  </div>
                </div>

                {/* Site Address */}
                {(() => {
                  const pName = (resolvedJob as any).propertyName
                  const pStreet = (resolvedJob as any).propertyStreet
                  const pStreet2 = (resolvedJob as any).propertyStreet2
                  const pCity = (resolvedJob as any).propertyCity
                  const pState = (resolvedJob as any).propertyState
                  const pZip = (resolvedJob as any).propertyZipCode
                  const hasAddress = pName || pStreet || pCity || pState || pZip
                  if (!hasAddress) return null

                  const cityStateZip = [pCity, pState].filter(Boolean).join(', ') + (pZip ? ` ${pZip}` : '')
                  const fullAddr = [pStreet, pStreet2, pCity, pState, pZip].filter(Boolean).join(', ')

                  return (
                    <Box sx={{ mt: 3 }}>
                      <SectionHeader>Site Address</SectionHeader>
                      <Box sx={{ mt: 1, p: 2.5, bgcolor: 'action.hover', borderRadius: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <i className='tabler-map-pin text-primary text-[22px]' style={{ marginTop: 2 }} />
                        <Box sx={{ flex: 1 }}>
                          {pName && <Typography variant='body1' fontWeight={600}>{pName}</Typography>}
                          {pStreet && <Typography variant='body1'>{pStreet}</Typography>}
                          {pStreet2 && <Typography variant='body1'>{pStreet2}</Typography>}
                          {cityStateZip.trim() && <Typography variant='body1'>{cityStateZip}</Typography>}
                        </Box>
                        {fullAddr && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, mt: 0.5 }}>
                            <Tooltip title='Open in Google Maps'>
                              <IconButton
                                size='small'
                                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(fullAddr)}`, '_blank')}
                                sx={{ color: 'primary.main', '&:hover': { bgcolor: 'primary.lightOpacity' } }}
                              >
                                <i className='tabler-map-search text-lg' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Satellite view'>
                              <IconButton
                                size='small'
                                onClick={() => window.open(`https://www.google.com/maps/@?api=1&map_action=map&center=${encodeURIComponent(fullAddr)}&zoom=18&basemap=satellite`, '_blank')}
                                sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'primary.lightOpacity', color: 'primary.main' } }}
                              >
                                <i className='tabler-satellite text-lg' />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )
                })()}

                {resolvedJob.description && (
                  <Box sx={{ mt: 4 }}>
                    <SectionHeader>Description</SectionHeader>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1, fontSize: '1.15rem', lineHeight: 1.6 }}>
                      {resolvedJob.description}
                    </Typography>
                  </Box>
                )}

                {/* Financial Summary */}
                {(() => {
                  const jobLineItems = (resolvedJob as any).lineItems ?? []
                  const subtotal = jobLineItems.reduce((s: number, li: any) => s + li.quantity * li.unitPrice, 0)
                  const discountType = (resolvedJob as any).discountType
                  const discountValue = parseFloat((resolvedJob as any).discountValue || '0')
                  const discountAmount = discountType === 'percent'
                    ? subtotal * (discountValue / 100)
                    : discountType === 'amount'
                      ? discountValue
                      : 0
                  // Get tax rate from resolvedJob.taxRate (stored value) or fallback to taxCode.rate (joined relation)
                  const taxRate = (resolvedJob as any).taxRate ?? (resolvedJob as any).taxCode?.rate ?? 0
                  const afterDiscount = subtotal - discountAmount
                  const taxAmount = afterDiscount * (taxRate / 100)
                  const total = afterDiscount + taxAmount

                  if (subtotal === 0) return null

                  return (
                    <Box sx={{ mt: 4 }}>
                      <SectionHeader>Financial Summary</SectionHeader>
                      <Box sx={{ mt: 2, p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body1" color="text.secondary">Subtotal</Typography>
                          <Typography variant="body1" fontWeight={500}>{fmtMoney(subtotal)}</Typography>
                        </Box>
                        {discountAmount > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body1" color="text.secondary">
                              Discount{discountType === 'percent' ? ` (${discountValue}%)` : ''}
                            </Typography>
                            <Typography variant="body1" fontWeight={500} color="error.main">-{fmtMoney(discountAmount)}</Typography>
                          </Box>
                        )}
                        {taxAmount > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body1" color="text.secondary">
                              Tax{taxRate ? ` (${taxRate}%)` : ''}
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>{fmtMoney(taxAmount)}</Typography>
                          </Box>
                        )}
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="h6" fontWeight={700}>Total</Typography>
                          <Typography variant="h6" fontWeight={700} color="primary.main">{fmtMoney(total)}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  )
                })()}

                {/* Products & Services */}
                {(() => {
                  const jobLineItems = (resolvedJob as any).lineItems ?? []
                  if (jobLineItems.length === 0) return null
                  const total = jobLineItems.reduce((s: number, li: any) => s + li.quantity * li.unitPrice, 0)
                  return (
                    <Box sx={{ mt: 4 }}>
                      <Accordion
                        expanded={expandedSections.lineItems}
                        onChange={() => setExpandedSections(p => ({ ...p, lineItems: !p.lineItems }))}
                        disableGutters elevation={0}
                        sx={{ '&:before': { display: 'none' }, border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
                      >
                        <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ px: 3, bgcolor: 'action.hover' }}>
                          <Typography variant='subtitle1' fontWeight={600}>
                            Products &amp; Services ({jobLineItems.length})
                            <Typography component='span' variant='body2' color='text.secondary' sx={{ ml: 1 }}>
                              — {fmtMoney(total)}
                            </Typography>
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 3, pt: 0, pb: 2 }}>
                          {jobLineItems.map((item: any, i: number) => (
                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: i < jobLineItems.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                              <Box>
                                <Typography variant='body1' fontWeight={500}>{item.description}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Qty: {item.quantity} × {fmtMoney(item.unitPrice)}
                                </Typography>
                              </Box>
                              <Typography variant='body1' fontWeight={600}>
                                {fmtMoney(item.total ?? item.quantity * item.unitPrice)}
                              </Typography>
                            </Box>
                          ))}
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2, mt: 1, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant='subtitle1' fontWeight={700}>Total: {fmtMoney(total)}</Typography>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  )
                })()}

              </Box>
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                      <Button variant="contained" size="large" startIcon={<i className="tabler-receipt" />} onClick={() => router.push(`/invoices?add=1&jobId=${resolvedJob.id}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-invoice)', '&:hover': { bgcolor: 'var(--color-action-invoice-hover)' } }}>
                        Create Invoice
                      </Button>
                      {(resolvedJob as any).quoteId && (
                        <Button variant="outlined" size="large" startIcon={<i className="tabler-external-link" />} onClick={() => router.push(`/quotes?edit=${(resolvedJob as any).quoteId}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start' }}>
                          View Associated Quote
                        </Button>
                      )}
                      {(resolvedJob as any).requestId && (
                        <Button variant="outlined" size="large" startIcon={<i className="tabler-external-link" />} onClick={() => router.push(`/requests?edit=${(resolvedJob as any).requestId}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start' }}>
                          View Original Request
                        </Button>
                      )}
                    </Box>
                  </Box>

                  <Box>
                    <SectionHeader>Notes</SectionHeader>
                    {(!resolvedJob.notes && !(resolvedJob as any).internalNotes) && (
                       <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>No notes provided.</Typography>
                    )}
                    {resolvedJob.notes && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes (Technicians)</Typography>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{resolvedJob.notes}</Typography>
                      </Box>
                    )}
                    {(resolvedJob as any).internalNotes && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main', borderRadius: 2 }}>
                        <Typography variant='caption' color='warning.dark' sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Internal Notes (Admin)</Typography>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{(resolvedJob as any).internalNotes}</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Invoices Accordion */}
                  {resolvedInvoices && resolvedInvoices.length > 0 && (
                    <Box>
                      <Accordion expanded={expandedSections.invoices} onChange={() => setExpandedSections(p => ({ ...p, invoices: !p.invoices }))} sx={{ bgcolor: 'background.paper' }}>
                        <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                          <Typography variant="subtitle1" fontWeight={700} fontSize="1.1rem">Invoices ({resolvedInvoices.length})</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          {resolvedInvoices.map((inv: any) => (
                            <Box key={inv.id} onDoubleClick={() => router.push(`/invoices?edit=${inv.id}`)} className="flex items-center gap-3 px-3 py-2 cursor-pointer border-t border-divider hover:bg-action-hover">
                              <i className='tabler-receipt text-md' />
                              <Box className='flex-1'>
                                <Typography variant="body1" fontWeight={600}>{inv.invoiceNumber}</Typography>
                              </Box>
                            </Box>
                          ))}
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  )}

                  <Box>
                    <Accordion expanded={expandedSections.gallery} onChange={() => setExpandedSections(p => ({ ...p, gallery: !p.gallery }))} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                      <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ p: 0, minHeight: 'auto', '& .MuiAccordionSummary-content': { my: 0 } }}>
                         <SectionHeader>Gallery</SectionHeader>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0, pt: 2 }}>
                        <PhotoGallerySection entityId={resolvedJob.id} entityType="job" />
                      </AccordionDetails>
                    </Accordion>
                  </Box>

                  {/* Activity History */}
                  <Box>
                    <Accordion expanded={expandedSections.history} onChange={() => setExpandedSections(p => ({ ...p, history: !p.history }))} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                      <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ p: 0, minHeight: 'auto', '& .MuiAccordionSummary-content': { my: 0 } }}>
                        <Typography variant="subtitle1" fontWeight={700} fontSize="1.1rem" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className='tabler-history text-lg' style={{ color: 'var(--mui-palette-text-secondary)' }} />
                          Activity History
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        {expandedSections.history && <EntityHistoryPanel entityId={resolvedJob.id} entityType="job" emptyMessage="No activity history for this job yet." />}
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
      {resolvedJob && (
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'center' }}>
          <AuditFooter creAt={resolvedJob.creAt} creBy={resolvedJob.creBy} modAt={resolvedJob.modAt} modBy={resolvedJob.modBy} divider={false} />
        </DialogActions>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} disableEnforceFocus PaperProps={{ sx: { minWidth: 400 } }}>
        <DialogTitle>Delete Job?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this job? This action cannot be undone.</DialogContentText>
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
