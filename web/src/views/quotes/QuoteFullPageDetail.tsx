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
import Divider from '@mui/material/Divider'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import CircularProgress from '@mui/material/CircularProgress'

import AuditFooter from '@/components/AuditFooter'
import SectionHeader from '@/components/SectionHeader'
import PhotoGallerySection from '@/components/PhotoGallerySection'
import QuoteEditPanel from './QuoteEditPanel'
import EntityHistoryPanel from '@/components/EntityHistoryPanel'

import type { Quote, QuoteLineItem } from '@shared/contracts'

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'error' | 'success' | 'secondary' | 'primary'> = {
  draft: 'secondary',
  sent: 'info',
  accepted: 'success',
  declined: 'error',
  expired: 'warning',
}

const fmtDate = (s: string | null | undefined) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtMoney = (n: number | null | undefined) => n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—'

const FieldDisplay = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body1" color="text.secondary" display="block">{label}</Typography>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>{value}</Typography>
    </Box>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onEdit: () => void
  quote?: Quote
  quoteId?: string | null
  initialEditing?: boolean
  initialClientId?: string | null
  initialRequestId?: string | null
  initialTaxCodeId?: string | null
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
 * Full-page quote detail with line items, emails, signature, and conversion to job/invoice.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/quotes/QuoteFullPageDetail.tsx
 */
export default function QuoteFullPageDetail({ open, onClose, onEdit, quote, quoteId, initialEditing, initialClientId, initialRequestId, initialTaxCodeId }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Self-fetch when quoteId is provided but quote is not
  const { data: fetchedQuote } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => api.get<Quote>(`/api/quotes/${quoteId}`),
    enabled: !!quoteId && !quote
  })
  const resolvedQuote = quote || fetchedQuote

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
      const response = await fetch(`/api/reports/quote/?format=pdf`, {
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
    mutationFn: () => api.delete(`/api/quotes/${resolvedQuote?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onClose()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      if (error?.response?.status === 409 && errorData?.error) {
        alert(errorData.error)
      } else {
        alert('Failed to delete quote.')
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

  const clientName = resolvedQuote?.client ? (resolvedQuote.client.useCompanyName && resolvedQuote.client.company ? resolvedQuote.client.company : `${resolvedQuote.client.firstName || ''} ${resolvedQuote.client.lastName || ''}`.trim()) : null

  const statusKey = (resolvedQuote?.status || '').toLowerCase()
  const statusColor = STATUS_COLORS[statusKey] ?? 'secondary'
  const hasProperty = resolvedQuote && (resolvedQuote.propertyName || resolvedQuote.propertyStreet || resolvedQuote.propertyCity)

  return (
    <Dialog
      open={open}
      onClose={() => (isEditing && resolvedQuote) ? setIsEditing(false) : onClose()}
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
              {!resolvedQuote ? 'Add Quote' : isEditing ? 'Edit Quote' : (resolvedQuote.quoteNumber ? `Quote ${resolvedQuote.quoteNumber}` : 'Quote Details')}
            </Typography>
            <Box className="flex items-center gap-2 mt-0.5">
              {resolvedQuote?.status && <Chip label={resolvedQuote.status.charAt(0).toUpperCase() + resolvedQuote.status.slice(1)} size='small' color={statusColor} variant='tonal' />}
            </Box>
          </Box>
        </Box>
        <Box className="flex items-center gap-2">
          {isEditing ? (
            <>
              {resolvedQuote && (
                <Tooltip title="Delete Quote">
                  <IconButton onClick={() => setDeleteDialogOpen(true)} disabled={editState.isSaving} sx={{ color: 'error.main', bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}>
                    <i className="tabler-trash text-[28px]" />
                  </IconButton>
                </Tooltip>
              )}
              <Button variant="outlined" onClick={() => resolvedQuote ? setIsEditing(false) : onClose()} disabled={editState.isSaving} sx={{ borderRadius: '8px' }}>Cancel</Button>
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
          <IconButton onClick={() => (isEditing && resolvedQuote) ? setIsEditing(false) : onClose()} disabled={editState.isSaving}>
            <i className="tabler-x" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* CONTENT (Resizable Panels) */}
      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <QuoteEditPanel
            quoteId={resolvedQuote?.id || null}
            open={true}
            onClose={() => resolvedQuote ? setIsEditing(false) : onClose()}
            onSaved={() => resolvedQuote ? setIsEditing(false) : onClose()}
            inline={true}
            registerSave={(fn: any) => { saveFuncRef.current = fn }}
            onStateChange={setEditState}
            initialClientId={initialClientId}
            initialRequestId={initialRequestId}
            initialTaxCodeId={initialTaxCodeId}
          />
        ) : resolvedQuote ? (
          <PanelGroup direction="horizontal">
            {/* LEFT SECTION (70%) */}
            <Panel defaultSize={70} minSize={40}>
              <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
                <SectionHeader>Quote Details</SectionHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <FieldDisplay label="Title" value={resolvedQuote.title} />
                    <FieldDisplay label="Quote Number" value={resolvedQuote.quoteNumber} />
                    {clientName && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body1" color="text.secondary" display="block">Client</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className='tabler-user text-primary text-[20px]' />
                          <Typography sx={{ fontSize: '1.25rem', fontWeight: 500, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => router.push(`/clients?edit=${resolvedQuote.clientId}`)}>
                            {clientName}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </div>
                  <div>
                    <FieldDisplay label="Job Type" value={(resolvedQuote as any).jobType} />
                    <FieldDisplay label="Issue Date" value={fmtDate(resolvedQuote.issueDate)} />
                    <FieldDisplay label="Expiry Date" value={fmtDate(resolvedQuote.expiryDate)} />
                  </div>
                </div>

                {resolvedQuote.description && (
                  <Box sx={{ mt: 4 }}>
                    <SectionHeader>Description</SectionHeader>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1, fontSize: '1.15rem', lineHeight: 1.6 }}>
                      {resolvedQuote.description}
                    </Typography>
                  </Box>
                )}

                {/* Financial Summary */}
                <Box sx={{ mt: 4 }}>
                  <SectionHeader>Financial Summary</SectionHeader>
                  <Box sx={{ mt: 2, p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" color="text.secondary">Subtotal</Typography>
                      <Typography variant="body1" fontWeight={500}>{fmtMoney(resolvedQuote.subtotal)}</Typography>
                    </Box>
                    {resolvedQuote.discountAmount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" color="text.secondary">
                          Discount{resolvedQuote.discountType === 'percent' ? ` (${resolvedQuote.discountValue}%)` : ''}
                        </Typography>
                        <Typography variant="body1" fontWeight={500} color="success.main">-{fmtMoney(resolvedQuote.discountAmount)}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" color="text.secondary">
                        Tax{resolvedQuote.taxRate ? ` (${resolvedQuote.taxRate}%)` : ''}
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>{fmtMoney(resolvedQuote.taxAmount)}</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6" fontWeight={700}>Total</Typography>
                      <Typography variant="h6" fontWeight={700} color="primary.main">{fmtMoney(resolvedQuote.total)}</Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Property / Job Location */}
                {hasProperty && (
                  <Box sx={{ mt: 4 }}>
                    <SectionHeader>Job Location</SectionHeader>
                    {resolvedQuote.propertyName && <Typography variant='body1' fontWeight={600} gutterBottom sx={{ mt: 1 }}>{resolvedQuote.propertyName}</Typography>}
                    {resolvedQuote.propertyStreet && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mt: 1 }}>
                        <i className='tabler-map-pin text-textSecondary text-[20px] mt-0.5' />
                        <Box>
                          <Typography sx={{ fontSize: '1.15rem', fontWeight: 500 }}>{resolvedQuote.propertyStreet}</Typography>
                          {resolvedQuote.propertyStreet2 && <Typography sx={{ fontSize: '1.15rem', fontWeight: 500 }}>{resolvedQuote.propertyStreet2}</Typography>}
                          <Typography sx={{ fontSize: '1.15rem', fontWeight: 500 }}>
                            {[resolvedQuote.propertyCity, resolvedQuote.propertyState, resolvedQuote.propertyZipCode].filter(Boolean).join(', ')}
                          </Typography>
                        </Box>
                        <Tooltip title='Open in Maps'>
                          <IconButton size='small' sx={{ ml: 2, bgcolor: 'action.hover' }} onClick={() => {
                              const addr = [resolvedQuote.propertyStreet, resolvedQuote.propertyCity, resolvedQuote.propertyState, resolvedQuote.propertyZipCode].filter(Boolean).join(', ')
                              window.open(`https://maps.google.com?q=${encodeURIComponent(addr)}`, '_blank')
                            }}>
                            <i className='tabler-map text-base' />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Customer Acceptance */}
                {resolvedQuote.signedAt && (
                  <Box sx={{ mt: 4 }}>
                    <SectionHeader>Customer Acceptance</SectionHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <FieldDisplay label="Signed By" value={resolvedQuote.signedByName} />
                        <FieldDisplay label="Signed At" value={fmtDate(resolvedQuote.signedAt)} />
                      </div>
                      <div>
                        <FieldDisplay label="Accepted Online" value={resolvedQuote.acceptedOnline ? 'Yes' : 'No'} />
                      </div>
                    </div>
                  </Box>
                )}

                {/* Products & Services */}
                {resolvedQuote.lineItems && resolvedQuote.lineItems.length > 0 && (() => {
                  const subtotal = resolvedQuote.lineItems!.reduce((s, li) => s + li.quantity * li.unitPrice, 0)
                  return (
                    <Box sx={{ mt: 2 }}>
                      <Accordion
                        expanded={expandedSections.lineItems}
                        onChange={() => setExpandedSections(p => ({ ...p, lineItems: !p.lineItems }))}
                        disableGutters elevation={0}
                        sx={{ '&:before': { display: 'none' }, border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
                      >
                        <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ px: 3, bgcolor: 'action.hover' }}>
                          <Typography variant='subtitle1' fontWeight={600}>
                            Products &amp; Services ({resolvedQuote.lineItems!.length})
                            <Typography component='span' variant='body2' color='text.secondary' sx={{ ml: 1 }}>
                              — {fmtMoney(subtotal)}
                            </Typography>
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 3, pt: 0, pb: 2 }}>
                          {resolvedQuote.lineItems!.map((item, i) => (
                            <Box key={item.id ?? i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: i < resolvedQuote.lineItems!.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                              <Box>
                                <Typography variant='body1' fontWeight={500}>{item.description}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Qty: {item.quantity} × {fmtMoney(item.unitPrice)}
                                  {item.taxable && <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>· Taxable</Typography>}
                                </Typography>
                              </Box>
                              <Typography variant='body1' fontWeight={600}>{fmtMoney(item.total ?? item.quantity * item.unitPrice)}</Typography>
                            </Box>
                          ))}
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2, mt: 1, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant='subtitle1' fontWeight={700}>Total: {fmtMoney(subtotal)}</Typography>
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
                      <Button variant="contained" size="large" startIcon={<i className="tabler-briefcase" />} onClick={() => router.push(`/jobs?add=1&quoteId=${resolvedQuote.id}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-job)', '&:hover': { bgcolor: 'var(--color-action-job-hover)' } }}>
                        Create Job from Quote
                      </Button>
                      <Button variant="contained" size="large" startIcon={<i className="tabler-receipt" />} onClick={() => router.push(`/invoices?add=1&quoteId=${resolvedQuote.id}`)} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-invoice)', '&:hover': { bgcolor: 'var(--color-action-invoice-hover)' } }}>
                        Convert to Invoice
                      </Button>
                    </Box>
                  </Box>

                  <Box>
                    <SectionHeader>Terms &amp; Notes</SectionHeader>
                    {(!resolvedQuote.customerMessage && !resolvedQuote.notes && !resolvedQuote.termsConditions) && (
                       <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>No notes provided.</Typography>
                    )}
                    {resolvedQuote.customerMessage && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer Message</Typography>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{resolvedQuote.customerMessage}</Typography>
                      </Box>
                    )}
                    {resolvedQuote.termsConditions && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Terms &amp; Conditions</Typography>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{resolvedQuote.termsConditions}</Typography>
                      </Box>
                    )}
                    {resolvedQuote.notes && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main', borderRadius: 2 }}>
                        <Typography variant='caption' color='warning.dark' sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Internal Notes (Admin)</Typography>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{resolvedQuote.notes}</Typography>
                      </Box>
                    )}
                  </Box>

                  <Box>
                    <Accordion expanded={expandedSections.gallery} onChange={() => setExpandedSections(p => ({ ...p, gallery: !p.gallery }))} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                      <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ p: 0, minHeight: 'auto', '& .MuiAccordionSummary-content': { my: 0 } }}>
                         <SectionHeader>Gallery</SectionHeader>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0, pt: 2 }}>
                        <PhotoGallerySection entityId={resolvedQuote.id} entityType="quote" />
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
                        {expandedSections.history && <EntityHistoryPanel entityId={resolvedQuote.id} entityType="quote" emptyMessage="No activity history for this quote yet." />}
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
        <AuditFooter creAt={resolvedQuote?.creAt} creBy={resolvedQuote?.creBy} modAt={resolvedQuote?.modAt} modBy={resolvedQuote?.modBy} divider={false} />
      </DialogActions>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} disableEnforceFocus PaperProps={{ sx: { minWidth: 400 } }}>
        <DialogTitle>Delete Quote?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this quote? This action cannot be undone.</DialogContentText>
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
