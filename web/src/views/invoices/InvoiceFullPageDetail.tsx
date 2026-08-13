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
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import CircularProgress from '@mui/material/CircularProgress'

import AuditFooter from '@/components/AuditFooter'
import SectionHeader from '@/components/SectionHeader'
import PhotoGallerySection from '@/components/PhotoGallerySection'
import { fmtStatus } from '@/utils/formatStatus'
import InvoiceEditPanel from './InvoiceEditPanel'
import EntityHistoryPanel from '@/components/EntityHistoryPanel'

import type { Invoice, InvoiceLineItem } from '@shared/contracts'

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'error' | 'success' | 'secondary' | 'primary'> = {
  draft: 'secondary',
  sent: 'info',
  viewed: 'info',
  partial: 'warning',
  paid: 'success',
  overdue: 'error',
  void: 'secondary',
}

const fmtDate = (s: string | null | undefined) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtMoney = (n: number | null | undefined) => n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—'

function DetailRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: string }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <Box className='flex items-start gap-3 px-4 py-3' sx={{ borderBottom: 1, borderColor: 'divider' }}>
      {icon && <i className={`${icon} text-lg mt-0.5 text-textSecondary`} />}
      <Box className='flex-1 min-w-0'>
        <Typography variant='caption' color='text.secondary' className='block'>{label}</Typography>
        <Typography variant='body2' fontWeight={500}>{value}</Typography>
      </Box>
    </Box>
  )
}

function FieldDisplay({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant='body1' color='text.secondary' display='block'>{label}</Typography>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>{value}</Typography>
    </Box>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onEdit: () => void
  invoice?: Invoice
  invoiceId?: string | null
  initialEditing?: boolean
  initialClientId?: string | null
  initialJobId?: string | null
  initialQuoteId?: string | null
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
 * Full-page invoice detail with line items, payment tracking, and linked job/quote references.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/invoices/InvoiceFullPageDetail.tsx
 */
export default function InvoiceFullPageDetail({ open, onClose, onEdit, invoice, invoiceId, initialEditing, initialClientId, initialJobId, initialQuoteId, initialRequestId, initialTaxCodeId }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(initialEditing ?? false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const saveFuncRef = useRef<(() => void) | undefined>(undefined)
  const [editState, setEditState] = useState({ isSaving: false, isValid: true })
  useEffect(() => {
    if (!isEditing) setEditState({ isSaving: false, isValid: true })
  }, [isEditing])
  const [printing, setPrinting] = useState(false)

  // Self-fetch when invoiceId is provided but invoice is not
  const { data: fetchedInvoice, isLoading: isFetchingInvoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => api.get<Invoice>(`/api/invoices/${invoiceId}`),
    enabled: !!invoiceId && !invoice
  })
  const resolvedInvoice = invoice || fetchedInvoice

  // Fetch job type lookups to resolve UUID to label
  const { data: jobTypes = [] } = useQuery({
    queryKey: ['lookups', 'jobType'],
    queryFn: () => api.get<Array<{ id: string; value: string }>>('/api/lookups/jobType'),
    enabled: !!resolvedInvoice?.jobType && !!resolvedInvoice
  })

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
      const response = await fetch(`/api/reports/invoice/?format=pdf`, {
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
    mutationFn: () => api.delete(`/api/invoices/${resolvedInvoice?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onClose()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      if (error?.response?.status === 409 && errorData?.error) {
        alert(errorData.error)
      } else {
        alert('Failed to delete invoice.')
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

  const clientName = resolvedInvoice?.client ? (resolvedInvoice.client.useCompanyName && resolvedInvoice.client.company ? resolvedInvoice.client.company : `${resolvedInvoice.client.firstName || ''} ${resolvedInvoice.client.lastName || ''}`.trim()) : null

  // Resolve jobType UUID to human-readable label
  const jobTypeLabel = resolvedInvoice?.jobType
    ? jobTypes.find(jt => jt.id === resolvedInvoice.jobType)?.value || resolvedInvoice.jobType
    : null

  const statusKey = (resolvedInvoice?.status || '').toLowerCase()
  const statusColor = STATUS_COLORS[statusKey] ?? 'secondary'

  const balance = resolvedInvoice ? resolvedInvoice.total - resolvedInvoice.amountPaid : 0
  const paidPct = resolvedInvoice && resolvedInvoice.total > 0 ? Math.min(100, (resolvedInvoice.amountPaid / resolvedInvoice.total) * 100) : 0
  const isOverdue = resolvedInvoice?.status !== 'paid' && resolvedInvoice?.dueDate && new Date(resolvedInvoice.dueDate) < new Date()

  // Loading state
  if (isFetchingInvoice) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={() => (isEditing && resolvedInvoice) ? setIsEditing(false) : onClose()}
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
              {!resolvedInvoice ? 'Add Invoice' : isEditing ? 'Edit Invoice' : (resolvedInvoice.invoiceNumber ? `Invoice ${resolvedInvoice.invoiceNumber}` : 'Invoice Details')}
            </Typography>
            <Box className="flex items-center gap-2 mt-0.5">
              {resolvedInvoice?.status && <Chip label={fmtStatus(resolvedInvoice.status)} size='small' color={statusColor} variant='tonal' />}
            </Box>
          </Box>
        </Box>
        <Box className="flex items-center gap-2">
          {isEditing ? (
            <>
              {resolvedInvoice && (
                <Tooltip title="Delete Invoice">
                  <IconButton onClick={() => setDeleteDialogOpen(true)} disabled={editState.isSaving} sx={{ color: 'error.main', bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}>
                    <i className="tabler-trash text-[28px]" />
                  </IconButton>
                </Tooltip>
              )}
              <Button variant="outlined" onClick={() => resolvedInvoice ? setIsEditing(false) : onClose()} disabled={editState.isSaving} sx={{ borderRadius: '8px' }}>Cancel</Button>
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
          <IconButton onClick={() => (isEditing && resolvedInvoice) ? setIsEditing(false) : onClose()} disabled={editState.isSaving}>
            <i className="tabler-x" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* CONTENT (Resizable Panels) */}
      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <InvoiceEditPanel
            invoiceId={resolvedInvoice?.id || null}
            open={true}
            onClose={() => resolvedInvoice ? setIsEditing(false) : onClose()}
            onSaved={() => resolvedInvoice ? setIsEditing(false) : onClose()}
            inline={true}
            registerSave={(fn: any) => { saveFuncRef.current = fn }}
            onStateChange={setEditState}
            initialClientId={initialClientId}
            initialJobId={initialJobId}
            initialQuoteId={initialQuoteId}
            initialRequestId={initialRequestId}
            initialTaxCodeId={initialTaxCodeId}
          />
        ) : resolvedInvoice ? (
          <PanelGroup direction="horizontal">
            {/* LEFT SECTION (70%) */}
            <Panel defaultSize={70} minSize={40}>
              <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
                <SectionHeader>Invoice Details</SectionHeader>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 mb-6'>
                  <div>
                    {(resolvedInvoice as any).title && <FieldDisplay label='Title' value={(resolvedInvoice as any).title} />}
                    {clientName && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant='body1' color='text.secondary' display='block'>Client</Typography>
                        <Typography
                          sx={{ fontSize: '1.25rem', fontWeight: 500, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          onClick={() => router.push(`/clients?edit=${(resolvedInvoice as any).clientId}`)}
                        >
                          {clientName}
                        </Typography>
                      </Box>
                    )}
                    {(resolvedInvoice as any).assignedTo && (
                      <FieldDisplay label='Assigned To' value={(resolvedInvoice as any).assignedTo.name || (resolvedInvoice as any).assignedTo.email} />
                    )}
                    {jobTypeLabel && <FieldDisplay label='Job Type' value={jobTypeLabel} />}
                    {(resolvedInvoice as any).paymentTerms && <FieldDisplay label='Payment Terms' value={(resolvedInvoice as any).paymentTerms} />}
                  </div>
                  <div>
                    <FieldDisplay label='Invoice Number' value={resolvedInvoice.invoiceNumber} />
                    <FieldDisplay label='Issue Date' value={fmtDate(resolvedInvoice.issueDate)} />
                    {resolvedInvoice.dueDate && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant='body1' color='text.secondary' display='block'>Due Date</Typography>
                        <Typography sx={{ fontSize: '1.25rem', fontWeight: 500, color: isOverdue ? 'error.main' : 'text.primary' }}>
                          {fmtDate(resolvedInvoice.dueDate)}{isOverdue ? ' — Overdue' : ''}
                        </Typography>
                      </Box>
                    )}
                    {resolvedInvoice.paidAt && <FieldDisplay label='Paid At' value={fmtDate(resolvedInvoice.paidAt)} />}
                  </div>
                </div>

                {resolvedInvoice.description && (
                  <>
                    <SectionHeader>Description</SectionHeader>
                    <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap', mt: 1, mb: 4, fontSize: '1.1rem', lineHeight: 1.75 }}>
                      {resolvedInvoice.description}
                    </Typography>
                  </>
                )}

                {/* Financial Summary */}
                <Box sx={{ mt: 4 }}>
                  <SectionHeader>Financial Summary</SectionHeader>
                  <Box sx={{ mt: 2, p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" color="text.secondary">Subtotal</Typography>
                      <Typography variant="body1" fontWeight={500}>{fmtMoney(resolvedInvoice.subtotal)}</Typography>
                    </Box>
                    {(resolvedInvoice as any).discountAmount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" color="text.secondary">
                          Discount{(resolvedInvoice as any).discountType === 'percent' ? ` (${(resolvedInvoice as any).discountValue}%)` : ''}
                        </Typography>
                        <Typography variant="body1" fontWeight={500} color="error.main">-{fmtMoney((resolvedInvoice as any).discountAmount)}</Typography>
                      </Box>
                    )}
                    {resolvedInvoice.taxAmount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" color="text.secondary">
                          Tax{(resolvedInvoice as any).taxRate ? ` (${(resolvedInvoice as any).taxRate}%)` : ''}
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>{fmtMoney(resolvedInvoice.taxAmount)}</Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" fontWeight={700}>Total</Typography>
                      <Typography variant="h6" fontWeight={700} color="primary.main">{fmtMoney(resolvedInvoice.total)}</Typography>
                    </Box>

                    {/* Payment Progress */}
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Payment Progress</Typography>
                        <Typography variant="body2" fontWeight={600}>{paidPct.toFixed(0)}%</Typography>
                      </Box>
                      <LinearProgress
                        variant='determinate'
                        value={paidPct}
                        color={resolvedInvoice.status === 'paid' ? 'success' : resolvedInvoice.status === 'overdue' ? 'error' : 'primary'}
                        sx={{ borderRadius: 4, height: 6 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="body2" color="success.main">Paid: {fmtMoney(resolvedInvoice.amountPaid)}</Typography>
                        <Typography variant="body2" color={balance > 0 ? 'warning.main' : 'text.secondary'}>
                          Balance: {fmtMoney(balance)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Property / Job Location */}
                {((resolvedInvoice as any).propertyName || (resolvedInvoice as any).propertyStreet) && (
                  <>
                    <SectionHeader>Job Location</SectionHeader>
                    <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                      {(resolvedInvoice as any).propertyName && (
                        <DetailRow label='Property Name' value={(resolvedInvoice as any).propertyName} icon='tabler-building' />
                      )}
                      {(resolvedInvoice as any).propertyStreet && (
                        <Box className='flex items-start gap-3 px-4 py-3' sx={{ borderBottom: 1, borderColor: 'divider' }}>
                          <i className='tabler-map-pin text-lg mt-0.5 text-textSecondary' />
                          <Box className='flex-1'>
                            <Typography variant='caption' color='text.secondary' className='block'>Address</Typography>
                            <Typography variant='body2'>{(resolvedInvoice as any).propertyStreet}</Typography>
                            {(resolvedInvoice as any).propertyStreet2 && <Typography variant='body2'>{(resolvedInvoice as any).propertyStreet2}</Typography>}
                            <Typography variant='body2'>
                              {[(resolvedInvoice as any).propertyCity, (resolvedInvoice as any).propertyState, (resolvedInvoice as any).propertyZipCode].filter(Boolean).join(', ')}
                            </Typography>
                          </Box>
                          <IconButton
                            size='small'
                            onClick={() => {
                              const addr = [(resolvedInvoice as any).propertyStreet, (resolvedInvoice as any).propertyCity, (resolvedInvoice as any).propertyState].filter(Boolean).join(', ')
                              window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, '_blank')
                            }}
                            sx={{ bgcolor: 'action.selected', color: 'text.primary', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }}
                          >
                            <i className='tabler-map-pin text-base' />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </>
                )}

                {/* Linked Records */}
                {((resolvedInvoice as any).job || (resolvedInvoice as any).quote) && (
                  <>
                    <SectionHeader>Linked Records</SectionHeader>
                    <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                      {(resolvedInvoice as any).job && (
                        <Box
                          className='flex items-center gap-3 px-4 py-4 cursor-pointer'
                          sx={{ borderBottom: (resolvedInvoice as any).quote ? 1 : 0, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
                          onClick={() => router.push(`/jobs?edit=${(resolvedInvoice as any).job!.id}`)}
                        >
                          <i className='tabler-briefcase text-lg text-textSecondary' />
                          <Box className='flex-1'>
                            <Typography variant='caption' color='text.secondary' className='block'>Linked Job</Typography>
                            <Typography variant='body2' fontWeight={500}>{(resolvedInvoice as any).job.title}</Typography>
                            <Typography variant='caption' color='text.secondary'>{(resolvedInvoice as any).job.jobNumber}</Typography>
                          </Box>
                          <i className='tabler-chevron-right text-textSecondary' />
                        </Box>
                      )}
                      {(resolvedInvoice as any).quote && (
                        <Box
                          className='flex items-center gap-3 px-4 py-4 cursor-pointer'
                          sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                          onClick={() => router.push(`/quotes?edit=${(resolvedInvoice as any).quote!.id}`)}
                        >
                          <i className='tabler-file-text text-lg text-textSecondary' />
                          <Box className='flex-1'>
                            <Typography variant='caption' color='text.secondary' className='block'>Linked Quote</Typography>
                            <Typography variant='body2' fontWeight={500}>{(resolvedInvoice as any).quote.title || (resolvedInvoice as any).quote.quoteNumber}</Typography>
                            <Typography variant='caption' color='text.secondary'>{(resolvedInvoice as any).quote.quoteNumber}</Typography>
                          </Box>
                          <i className='tabler-chevron-right text-textSecondary' />
                        </Box>
                      )}
                    </Box>
                  </>
                )}

                {/* Products & Services */}
                {(resolvedInvoice as any).lineItems && (resolvedInvoice as any).lineItems.length > 0 && (() => {
                  const items = (resolvedInvoice as any).lineItems
                  const subtotal = items.reduce((s: number, li: any) => s + li.quantity * li.unitPrice, 0)
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
                            Products &amp; Services ({items.length})
                            <Typography component='span' variant='body2' color='text.secondary' sx={{ ml: 1 }}>
                              — {fmtMoney(subtotal)}
                            </Typography>
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 3, pt: 0, pb: 2 }}>
                          {items.map((item: InvoiceLineItem, i: number) => (
                            <Box key={item.id ?? i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: i < items.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                              <Box>
                                <Typography variant='body1' fontWeight={500}>{item.description}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Qty: {item.quantity} × {fmtMoney(item.unitPrice)}
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
                      <Button variant="contained" size="large" startIcon={<i className="tabler-printer" />} onClick={() => window.open(`/api/invoices/${resolvedInvoice.id}/pdf`, '_blank')} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-job)', '&:hover': { bgcolor: 'var(--color-action-job-hover)' } }}>
                        Print / Download PDF
                      </Button>
                      <Button variant="contained" size="large" startIcon={<i className="tabler-send" />} onClick={() => alert('Send invoice feature coming soon')} sx={{ py: 1.5, fontSize: "1rem", justifyContent: 'flex-start', bgcolor: 'var(--color-action-invoice)', '&:hover': { bgcolor: 'var(--color-action-invoice-hover)' } }}>
                        Send to Client
                      </Button>
                    </Box>
                  </Box>

                  <Box>
                    <SectionHeader>Internal Notes</SectionHeader>
                    {(!resolvedInvoice.notes) && (
                       <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>No notes provided.</Typography>
                    )}
                    {resolvedInvoice.notes && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main', borderRadius: 2 }}>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{resolvedInvoice.notes}</Typography>
                      </Box>
                    )}
                  </Box>

                  <Box>
                    <Accordion expanded={expandedSections.gallery} onChange={() => setExpandedSections(p => ({ ...p, gallery: !p.gallery }))} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                      <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ p: 0, minHeight: 'auto', '& .MuiAccordionSummary-content': { my: 0 } }}>
                         <SectionHeader>Gallery</SectionHeader>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0, pt: 2 }}>
                        <PhotoGallerySection entityId={resolvedInvoice.id} entityType="invoice" />
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
                        {expandedSections.history && <EntityHistoryPanel entityId={resolvedInvoice.id} entityType="invoice" emptyMessage="No activity history for this invoice yet." />}
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
      {resolvedInvoice && (
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'center' }}>
          <AuditFooter creAt={resolvedInvoice.creAt} creBy={resolvedInvoice.creBy} modAt={resolvedInvoice.modAt} modBy={resolvedInvoice.modBy} divider={false} />
        </DialogActions>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} disableEnforceFocus PaperProps={{ sx: { minWidth: 400 } }}>
        <DialogTitle>Delete Invoice?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this invoice? This action cannot be undone.</DialogContentText>
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
