'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CircularProgress from '@mui/material/CircularProgress'
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
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'

import SectionHeader from '@/components/SectionHeader'
import AuditFooter from '@/components/AuditFooter'
import ContactLink from '@/components/ContactLink'
import PhotoGallerySection from '@/components/PhotoGallerySection'
import CustomAvatar from '@core/components/mui/Avatar'
import { getInitials } from '@/utils/getInitials'
import { fmtStatus } from '@/utils/formatStatus'
import RequestEditPanel from './RequestEditPanel'
import EntityHistoryPanel from '@/components/EntityHistoryPanel'

import type { Request, RequestLineItem } from '@shared/contracts'

const statusColorMap: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  new: 'info', pending: 'warning', in_review: 'primary', approved: 'success', declined: 'error', cancelled: 'secondary',
}
const fmtDate = (s: string | null | undefined) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtCurrency = (n: number | null | undefined) => n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—'

interface Props {
  open: boolean
  onClose: () => void
  onEdit: () => void
  request?: Request
  requestId?: string | null
  initialEditing?: boolean
  initialClientId?: string | null
  initialTaxCodeId?: string | null
}

const FieldDisplay = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body1" color="text.secondary" display="block">{label}</Typography>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>{value}</Typography>
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

/**
 * Full-page request detail with client info, priority, location, and conversion to quote/job.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/requests/RequestFullPageDetail.tsx
 */
export default function RequestFullPageDetail({ open, onClose, onEdit, request, requestId, initialEditing, initialClientId, initialTaxCodeId }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: fetchedRequest, isLoading: isFetching } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.get<Request>(`/api/requests/${requestId}`),
    enabled: !!requestId && !request && open
  })
  const resolvedRequest = request || fetchedRequest

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
      const response = await fetch(`/api/reports/request/?format=pdf`, {
        headers: { 'Authorization': `Bearer ` }
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
    history: false
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/requests/${resolvedRequest?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onClose()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      if (error?.response?.status === 409 && errorData?.error) {
        alert(errorData.error)
      } else {
        alert('Failed to delete resolvedRequest.')
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

  const clientName = resolvedRequest?.client ? (resolvedRequest.client.useCompanyName && resolvedRequest.client.company ? resolvedRequest.client.company : `${resolvedRequest.client.firstName || ''} ${resolvedRequest.client.lastName || ''}`.trim()) : null

  const statusKey = (resolvedRequest?.status || '').toLowerCase().replace(' ', '_')
  const statusColor = statusColorMap[statusKey] ?? 'secondary'
  const hasAddress = resolvedRequest && (resolvedRequest.street || resolvedRequest.city || resolvedRequest.state || resolvedRequest.zipCode)
  const lineItems = resolvedRequest?.lineItems ?? []
  const taxRate = (resolvedRequest as any)?.taxCode?.rate ?? null
  const subtotalAmt = lineItems.length > 0 ? lineItems.reduce((sum: number, item: RequestLineItem) => sum + item.quantity * item.unitPrice, 0) : null
  const taxAmt = (taxRate && subtotalAmt != null) ? lineItems.filter((item: any) => item.taxable).reduce((s: number, item: RequestLineItem) => s + item.quantity * item.unitPrice, 0) * taxRate / 100 : 0
  const total = subtotalAmt != null ? subtotalAmt + taxAmt : null

  return (
    <Dialog
      open={open}
      onClose={() => (isEditing && resolvedRequest) ? setIsEditing(false) : onClose()}
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
              {!resolvedRequest ? 'Add Request' : isEditing ? 'Edit Request' : (resolvedRequest.requestNumber ? `Request ${resolvedRequest.requestNumber}` : 'Request Details')}
            </Typography>
            <Box className="flex items-center gap-2 mt-0.5">
              {resolvedRequest?.status && <Chip label={fmtStatus(resolvedRequest.status)} size='small' color={statusColor} variant='tonal' />}
              {(resolvedRequest as any)?.requestType && <Chip label={(resolvedRequest as any).requestType} size='small' variant='outlined' />}
              {(resolvedRequest as any)?.tradeType && <Chip label={(resolvedRequest as any).tradeType} size='small' variant='outlined' color='secondary' />}
            </Box>
          </Box>
        </Box>
        <Box className="flex items-center gap-2">
          {isEditing ? (
            <>
              {resolvedRequest && (
                <Tooltip title="Delete Request">
                  <IconButton onClick={() => setDeleteDialogOpen(true)} disabled={editState.isSaving} sx={{ color: 'error.main', bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}>
                    <i className="tabler-trash text-[28px]" />
                  </IconButton>
                </Tooltip>
              )}
              <Button variant="outlined" onClick={() => resolvedRequest ? setIsEditing(false) : onClose()} disabled={editState.isSaving} sx={{ borderRadius: '8px' }}>Cancel</Button>
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
          <IconButton onClick={() => (isEditing && resolvedRequest) ? setIsEditing(false) : onClose()} disabled={editState.isSaving}>
            <i className="tabler-x" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* CONTENT (Resizable Panels) */}
      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isFetching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : isEditing ? (
          <RequestEditPanel
            requestId={resolvedRequest?.id || null}
            open={true}
            onClose={() => resolvedRequest ? setIsEditing(false) : onClose()}
            onSaved={() => resolvedRequest ? setIsEditing(false) : onClose()}
            inline={true}
            registerSave={(fn: any) => { saveFuncRef.current = fn }}
            onStateChange={setEditState}
            initialClientId={initialClientId}
            initialTaxCodeId={initialTaxCodeId}
          />
        ) : resolvedRequest ? (
          <PanelGroup direction="horizontal">
            {/* LEFT SECTION (70%) */}
            <Panel defaultSize={70} minSize={40}>
              <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
                <SectionHeader>Request Details</SectionHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <FieldDisplay label="Title" value={resolvedRequest.title} />
                    {clientName && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body1" color="text.secondary" display="block">Client</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className='tabler-user text-primary text-[20px]' />
                          <Typography sx={{ fontSize: '1.25rem', fontWeight: 500, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => router.push(`/clients?edit=${resolvedRequest.clientId}`)}>
                            {clientName}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    <FieldDisplay label="Assessment Date" value={fmtDate(resolvedRequest.assessmentDate)} />
                    <FieldDisplay label="Request Date" value={fmtDate((resolvedRequest as any).requestDate)} />
                  </div>
                  <div>
                    <FieldDisplay label="Assigned To" value={resolvedRequest.assignedTo?.name} />
                    {(resolvedRequest.clientPhone || resolvedRequest.clientEmail) && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body1" color="text.secondary" display="block">Contact</Typography>
                        {resolvedRequest.clientPhone && <ContactLink type='phone' value={resolvedRequest.clientPhone} label={resolvedRequest.clientPhone} className="block mt-1 space-x-2" />}
                        {resolvedRequest.clientEmail && <ContactLink type='email' value={resolvedRequest.clientEmail} label={resolvedRequest.clientEmail} className="block mt-1 space-x-2" />}
                      </Box>
                    )}
                    <FieldDisplay label="Lead Source" value={(resolvedRequest as any).leadSource} />
                    <FieldDisplay label="Priority" value={(resolvedRequest as any).priority} />
                    <FieldDisplay label="Job Type" value={(resolvedRequest as any).jobType} />
                    <FieldDisplay label="Contact Method" value={(resolvedRequest as any).preferredContactMethod} />
                    <FieldDisplay label="Contact Time" value={(resolvedRequest as any).preferredContactTime} />
                    {(resolvedRequest as any).tags && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body1" color="text.secondary" display="block">Tags</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {(resolvedRequest as any).tags.split(',').map((tag: string) => (
                            <Chip key={tag.trim()} label={tag.trim()} size='small' variant='outlined' />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </div>
                </div>

                {hasAddress && (
                  <Box sx={{ mt: 2 }}>
                    <SectionHeader>Property Location</SectionHeader>
                    {resolvedRequest.propertyName && <Typography variant='body1' fontWeight={600} gutterBottom>{resolvedRequest.propertyName}</Typography>}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mt: 1 }}>
                      <i className='tabler-map-pin text-textSecondary text-[20px] mt-0.5' />
                      <Box>
                        {resolvedRequest.street && <Typography sx={{ fontSize: '1.15rem', fontWeight: 500 }}>{resolvedRequest.street}</Typography>}
                        {resolvedRequest.street2 && <Typography sx={{ fontSize: '1.15rem', fontWeight: 500 }}>{resolvedRequest.street2}</Typography>}
                        <Typography sx={{ fontSize: '1.15rem', fontWeight: 500 }}>
                          {[resolvedRequest.city, resolvedRequest.state, resolvedRequest.zipCode].filter(Boolean).join(', ')}
                        </Typography>
                      </Box>
                      <Tooltip title='Open in Maps'>
                        <IconButton size='small' sx={{ ml: 2, bgcolor: 'action.hover' }} onClick={() => {
                            const addr = [resolvedRequest.street, resolvedRequest.city, resolvedRequest.state, resolvedRequest.zipCode].filter(Boolean).join(', ')
                            window.open(`https://maps.google.com?q=${encodeURIComponent(addr)}`, '_blank')
                          }}>
                          <i className='tabler-map text-base' />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )}

                {resolvedRequest.description && (
                  <Box sx={{ mt: 4 }}>
                    <SectionHeader>Description</SectionHeader>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1, fontSize: '1.15rem', lineHeight: 1.6 }}>
                      {resolvedRequest.description}
                    </Typography>
                  </Box>
                )}

                {subtotalAmt != null && (
                  <Box sx={{ mt: 4, p: 2.5, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
                    <SectionHeader>Financial Summary</SectionHeader>
                    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant='body2' color='text.secondary'>Subtotal</Typography>
                        <Typography variant='body2' fontWeight={500}>{fmtCurrency(subtotalAmt)}</Typography>
                      </Box>
                      {taxRate && taxAmt > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant='body2' color='text.secondary'>Tax ({taxRate}%)</Typography>
                          <Typography variant='body2' fontWeight={500}>{fmtCurrency(taxAmt)}</Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, mt: 0.5, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant='subtitle2' fontWeight={700}>Total</Typography>
                        <Typography variant='subtitle2' fontWeight={700}>{fmtCurrency(total)}</Typography>
                      </Box>
                    </Box>
                  </Box>
                )}

                {lineItems.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Accordion expanded={expandedSections.lineItems} onChange={() => setExpandedSections(p => ({ ...p, lineItems: !p.lineItems }))} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                      <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ px: 3, bgcolor: 'action.hover' }}>
                        <Typography variant='subtitle1' fontWeight={600}>
                          Products &amp; Services ({lineItems.length})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 3, pt: 0, pb: 2 }}>
                        {lineItems.map((item: any, i: number) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: i < lineItems.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                            <Box>
                              <Typography variant='body1' fontWeight={500}>{item.description}</Typography>
                              <Typography variant='body2' color='text.secondary'>Qty: {item.quantity} × {fmtCurrency(item.unitPrice)}</Typography>
                            </Box>
                            <Typography variant='body1' fontWeight={600}>{fmtCurrency(item.total ?? item.quantity * item.unitPrice)}</Typography>
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )}
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
                      {!resolvedRequest.quote && (
                        <Button variant="contained" size="large" startIcon={<i className="tabler-file-text" />} onClick={() => router.push(`/quotes?add=1&clientId=${resolvedRequest.clientId}&requestId=${resolvedRequest.id}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-quote)', '&:hover': { bgcolor: 'var(--color-action-quote-hover)' } }}>
                          Create Quote from Request
                        </Button>
                      )}
                      {!resolvedRequest.job && (
                        <Button variant="contained" size="large" startIcon={<i className="tabler-briefcase" />} onClick={() => router.push(`/jobs?add=1&clientId=${resolvedRequest.clientId}&requestId=${resolvedRequest.id}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-job)', '&:hover': { bgcolor: 'var(--color-action-job-hover)' } }}>
                          Create Job from Request
                        </Button>
                      )}
                      {!resolvedRequest.invoice && (
                        <Button variant="contained" size="large" startIcon={<i className="tabler-file-invoice" />} onClick={() => router.push(`/invoices?add=1&clientId=${resolvedRequest.clientId}&requestId=${resolvedRequest.id}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-invoice)', '&:hover': { bgcolor: 'var(--color-action-invoice-hover)' } }}>
                          Create Invoice from Request
                        </Button>
                      )}
                      {resolvedRequest.quote && (
                        <Button variant="outlined" size="large" startIcon={<i className="tabler-external-link" />} onClick={() => router.push(`/quotes?edit=${resolvedRequest.quote?.id}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start' }}>
                          View Quote {resolvedRequest.quote?.quoteNumber}
                        </Button>
                      )}
                      {resolvedRequest.job && (
                        <Button variant="outlined" size="large" startIcon={<i className="tabler-external-link" />} onClick={() => router.push(`/jobs?edit=${resolvedRequest.job?.id}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start' }}>
                          View Job {resolvedRequest.job?.jobNumber}
                        </Button>
                      )}
                      {resolvedRequest.invoice && (
                        <Button variant="outlined" size="large" startIcon={<i className="tabler-external-link" />} onClick={() => router.push(`/invoices?edit=${resolvedRequest.invoice?.id}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start' }}>
                          View Invoice {resolvedRequest.invoice?.invoiceNumber}
                        </Button>
                      )}
                    </Box>
                  </Box>

                  <Box>
                    <SectionHeader>Notes</SectionHeader>
                    {(!resolvedRequest.customerMessage && !resolvedRequest.internalNotes) && (
                       <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>No notes provided.</Typography>
                    )}
                    {resolvedRequest.customerMessage && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer Message</Typography>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{resolvedRequest.customerMessage}</Typography>
                      </Box>
                    )}
                    {resolvedRequest.internalNotes && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main', borderRadius: 2 }}>
                        <Typography variant='caption' color='warning.dark' sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Internal Notes (Admin)</Typography>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{resolvedRequest.internalNotes}</Typography>
                      </Box>
                    )}
                  </Box>

                  <Box>
                    <Accordion expanded={expandedSections.gallery} onChange={() => setExpandedSections(p => ({ ...p, gallery: !p.gallery }))} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                      <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ p: 0, minHeight: 'auto', '& .MuiAccordionSummary-content': { my: 0 } }}>
                         <SectionHeader>Gallery</SectionHeader>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0, pt: 2 }}>
                        <PhotoGallerySection entityId={resolvedRequest.id} entityType="request" />
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
                        {expandedSections.history && <EntityHistoryPanel entityId={resolvedRequest.id} entityType="request" emptyMessage="No activity history for this request yet." />}
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
        <AuditFooter creAt={request?.creAt} creBy={request?.creBy} modAt={request?.modAt} modBy={request?.modBy} divider={false} />
      </DialogActions>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} disableEnforceFocus PaperProps={{ sx: { minWidth: 400 } }}>
        <DialogTitle>Delete Request?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this request? This action cannot be undone.</DialogContentText>
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
