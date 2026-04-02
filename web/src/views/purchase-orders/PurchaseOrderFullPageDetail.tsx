'use client'

import { useState, useRef, useEffect } from 'react'
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
import CircularProgress from '@mui/material/CircularProgress'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'

import AuditFooter from '@/components/AuditFooter'
import SectionHeader from '@/components/SectionHeader'
import PhotoGallerySection from '@/components/PhotoGallerySection'
import { fmtStatus } from '@/utils/formatStatus'
import PurchaseOrderEditPanel from './PurchaseOrderEditPanel'

import type { PurchaseOrder, PurchaseOrderLineItem } from '@shared/contracts'

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'error' | 'success' | 'secondary' | 'primary'> = {
  draft: 'secondary',
  issued: 'info',
  'partial received': 'warning',
  'received complete': 'success',
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const fmtMoney = (n: number | null | undefined) =>
  n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—'

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

interface Props {
  open: boolean
  onClose: () => void
  onEdit: () => void
  po?: PurchaseOrder
  poId?: string | null
  initialEditing?: boolean
  initialVendorId?: string | null
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
 * Full-page PO detail with vendor info, line items, shipping, and linked job reference.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/purchase-orders/PurchaseOrderFullPageDetail.tsx
 */
export default function PurchaseOrderFullPageDetail({ open, onClose, onEdit, po, poId, initialEditing, initialVendorId, initialTaxCodeId }: Props) {
  const queryClient = useQueryClient()

  const { data: fetchedPO, isLoading: fetchLoading } = useQuery<PurchaseOrder>({
    queryKey: ['purchase-order', poId],
    queryFn: () => api.get(`/api/purchase-orders/${poId}`),
    enabled: !!poId && !po
  })
  const resolvedPO = po || fetchedPO

  const [isEditing, setIsEditing] = useState(initialEditing ?? false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const saveFuncRef = useRef<(() => void) | undefined>(undefined)
  const [editState, setEditState] = useState({ isSaving: false, isValid: true })
  useEffect(() => {
    if (!isEditing) setEditState({ isSaving: false, isValid: true })
  }, [isEditing])
  const [printing, setPrinting] = useState(false)

  const [expandedSections, setExpandedSections] = useState({
    lineItems: false,
    gallery: false
  })

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
      const response = await fetch(`${BACKEND}/api/reports/purchase-order/${resolvedPO?.id}?format=pdf`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jm_token')}` }
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const blob = await response.blob()
      window.open(window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })), '_blank')
    } catch (error) {
      console.error('Print failed:', error)
    } finally {
      setPrinting(false)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/purchase-orders/${resolvedPO?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      onClose()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      if (error?.response?.status === 409 && errorData?.error) {
        alert(errorData.error)
      } else {
        alert('Failed to delete purchase order.')
      }
    }
  })

  const handleDelete = () => {
    deleteMutation.mutate()
    setDeleteDialogOpen(false)
  }

  const statusKey = (resolvedPO?.status || '').toLowerCase()
  const statusColor = STATUS_COLORS[statusKey] ?? 'secondary'

  const isOverdue = resolvedPO && !['received complete'].includes(statusKey) && resolvedPO?.dueDate && new Date(resolvedPO.dueDate) < new Date()

  return (
    <Dialog
      open={open}
      onClose={() => (isEditing && po) ? setIsEditing(false) : onClose()}
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
              {!resolvedPO ? 'Add Purchase Order' : isEditing ? 'Edit Purchase Order' : (resolvedPO.purchaseOrderNumber ? `PO ${resolvedPO.purchaseOrderNumber}` : 'Purchase Order Details')}
            </Typography>
            <Box className="flex items-center gap-2 mt-0.5">
              {resolvedPO?.status && <Chip label={fmtStatus(resolvedPO.status)} size='small' color={statusColor} variant='tonal' />}
              {(resolvedPO as any)?.vendor?.company && <Chip label={(resolvedPO as any).vendor.company} size='small' variant='tonal' color='secondary' />}
            </Box>
          </Box>
        </Box>
        <Box className="flex items-center gap-2">
          {isEditing ? (
            <>
              {resolvedPO && (
                <Tooltip title="Delete Purchase Order">
                  <IconButton onClick={() => setDeleteDialogOpen(true)} disabled={editState.isSaving} sx={{ color: 'error.main', bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}>
                    <i className="tabler-trash text-[28px]" />
                  </IconButton>
                </Tooltip>
              )}
              <Button variant="outlined" onClick={() => resolvedPO ? setIsEditing(false) : onClose()} disabled={editState.isSaving} sx={{ borderRadius: '8px' }}>Cancel</Button>
              <Button variant="contained" onClick={() => saveFuncRef.current?.()} disabled={editState.isSaving} sx={{ borderRadius: '8px', minWidth: '80px' }}>
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
          <IconButton onClick={() => (isEditing && resolvedPO) ? setIsEditing(false) : onClose()} disabled={editState.isSaving}>
            <i className="tabler-x" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* CONTENT */}
      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {fetchLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress />
          </Box>
        ) : isEditing ? (
          <PurchaseOrderEditPanel
            poId={resolvedPO?.id || null}
            open={true}
            onClose={() => resolvedPO ? setIsEditing(false) : onClose()}
            onSaved={() => resolvedPO ? setIsEditing(false) : onClose()}
            inline={true}
            registerSave={(fn: any) => { saveFuncRef.current = fn }}
            onStateChange={setEditState}
            initialVendorId={initialVendorId}
            initialTaxCodeId={initialTaxCodeId}
          />
        ) : resolvedPO ? (
        <PanelGroup direction="horizontal">
            {/* LEFT SECTION (70%) */}
            <Panel defaultSize={70} minSize={40}>
              <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
                <SectionHeader>Purchase Order Details</SectionHeader>
                <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                  <DetailRow label='PO Number' value={resolvedPO.purchaseOrderNumber} icon='tabler-hash' />
                  <DetailRow label='Title' value={resolvedPO.title} icon='tabler-file-text' />
                  <DetailRow label='Vendor' value={(resolvedPO as any).vendor?.company} icon='tabler-building-store' />
                  {/* Dates — three fields on one row */}
                  <Box className='flex items-start px-4 py-3' sx={{ borderBottom: 1, borderColor: 'divider', gap: 4 }}>
                    <Box className='flex items-start gap-3 flex-1'>
                      <i className='tabler-calendar text-lg mt-0.5 text-textSecondary' />
                      <Box>
                        <Typography variant='caption' color='text.secondary' className='block'>Issue Date</Typography>
                        <Typography variant='body2' fontWeight={500}>{fmtDate(resolvedPO.issueDate) || '—'}</Typography>
                      </Box>
                    </Box>
                    <Box className='flex items-start gap-3 flex-1'>
                      <i className='tabler-calendar-due text-lg mt-0.5 text-textSecondary' />
                      <Box>
                        <Typography variant='caption' color='text.secondary' className='block'>Due Date</Typography>
                        <Typography variant='body2' fontWeight={500} color={isOverdue ? 'error.main' : 'text.primary'}>
                          {resolvedPO.dueDate ? `${fmtDate(resolvedPO.dueDate)}${isOverdue ? ' — Overdue' : ''}` : '—'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box className='flex items-start gap-3 flex-1'>
                      <i className='tabler-calendar-check text-lg mt-0.5 text-textSecondary' />
                      <Box>
                        <Typography variant='caption' color='text.secondary' className='block'>Expected Delivery</Typography>
                        <Typography variant='body2' fontWeight={500}>{fmtDate((resolvedPO as any).expectedDeliveryDate) || '—'}</Typography>
                      </Box>
                    </Box>
                  </Box>
                  {/* Issued By / Vendor Ref / Tracking — three fields on one row */}
                  <Box className='flex items-start px-4 py-3' sx={{ borderBottom: 1, borderColor: 'divider', gap: 4 }}>
                    <Box className='flex items-start gap-3 flex-1'>
                      <i className='tabler-user text-lg mt-0.5 text-textSecondary' />
                      <Box>
                        <Typography variant='caption' color='text.secondary' className='block'>Issued By</Typography>
                        <Typography variant='body2' fontWeight={500}>{resolvedPO.issuePerson || '—'}</Typography>
                      </Box>
                    </Box>
                    <Box className='flex items-start gap-3 flex-1'>
                      <i className='tabler-bookmark text-lg mt-0.5 text-textSecondary' />
                      <Box>
                        <Typography variant='caption' color='text.secondary' className='block'>Vendor Ref #</Typography>
                        <Typography variant='body2' fontWeight={500}>{resolvedPO.vendorReferenceNumber || '—'}</Typography>
                      </Box>
                    </Box>
                    <Box className='flex items-start gap-3 flex-1'>
                      <i className='tabler-package text-lg mt-0.5 text-textSecondary' />
                      <Box>
                        <Typography variant='caption' color='text.secondary' className='block'>Tracking #</Typography>
                        <Typography variant='body2' fontWeight={500}>{resolvedPO.trackingNumber || '—'}</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <DetailRow label='Pay Terms' value={resolvedPO.payTerms} icon='tabler-clock' />
                  <DetailRow label='FOB' value={resolvedPO.fob} icon='tabler-truck' />
                  <DetailRow label='Ship Via' value={resolvedPO.shipVia} icon='tabler-ship' />
                  <DetailRow label='Client Ref #' value={resolvedPO.clientReferenceNumber} icon='tabler-bookmark' />
                  {resolvedPO.receivedBy && <DetailRow label='Received By' value={resolvedPO.receivedBy} icon='tabler-check' />}
                </Box>

                {/* Ship To */}
                {(resolvedPO.propertyName || resolvedPO.propertyStreet) && (
                  <>
                    <SectionHeader>Ship To</SectionHeader>
                    <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                      <DetailRow label='Property Name' value={resolvedPO.propertyName} icon='tabler-building' />
                      {resolvedPO.propertyStreet && (
                        <Box className='flex items-start gap-3 px-4 py-3' sx={{ borderBottom: 1, borderColor: 'divider' }}>
                          <i className='tabler-map-pin text-lg mt-0.5 text-textSecondary' />
                          <Box className='flex-1'>
                            <Typography variant='caption' color='text.secondary' className='block'>Address</Typography>
                            <Typography variant='body2'>{resolvedPO.propertyStreet}</Typography>
                            {resolvedPO.propertyStreet2 && <Typography variant='body2'>{resolvedPO.propertyStreet2}</Typography>}
                            <Typography variant='body2'>
                              {[resolvedPO.propertyCity, resolvedPO.propertyState, resolvedPO.propertyZipCode].filter(Boolean).join(', ')}
                            </Typography>
                          </Box>
                          <IconButton
                            size='small'
                            onClick={() => {
                              const addr = [resolvedPO.propertyStreet, resolvedPO.propertyCity, resolvedPO.propertyState].filter(Boolean).join(', ')
                              window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, '_blank')
                            }}
                            sx={{ bgcolor: 'action.selected', color: 'text.primary', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }}
                          >
                            <i className='tabler-map-pin text-base' />
                          </IconButton>
                        </Box>
                      )}
                      <DetailRow label='Ship Contact' value={resolvedPO.shipContactName} icon='tabler-user' />
                      <DetailRow label='Ship Phone' value={resolvedPO.shipContactPhone} icon='tabler-phone' />
                    </Box>
                  </>
                )}

                {/* Financial Summary */}
                <SectionHeader>Financial Summary</SectionHeader>
                <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                  <DetailRow label='Subtotal' value={fmtMoney(resolvedPO.subtotal)} icon='tabler-receipt' />
                  {resolvedPO.discount > 0 && <DetailRow label='Discount' value={`- ${fmtMoney(resolvedPO.discount)}`} icon='tabler-tag' />}
                  {resolvedPO.taxAmount > 0 && (
                    <DetailRow
                      label={`Tax${resolvedPO.taxRate ? ` (${resolvedPO.taxRate}%)` : ''}`}
                      value={fmtMoney(resolvedPO.taxAmount)}
                      icon='tabler-percentage'
                    />
                  )}
                  {resolvedPO.freight > 0 && <DetailRow label='Freight' value={fmtMoney(resolvedPO.freight)} icon='tabler-truck' />}
                  <Box className='flex items-center gap-3 px-4 py-3' sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                    <i className='tabler-currency-dollar text-lg text-primary' />
                    <Box className='flex-1'>
                      <Typography variant='caption' color='text.secondary' className='block'>Total</Typography>
                      <Typography variant='h6' fontWeight={700} color='primary'>{fmtMoney(resolvedPO.total)}</Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Products & Services */}
                {(resolvedPO as any).lineItems && (resolvedPO as any).lineItems.length > 0 && (() => {
                  const items = (resolvedPO as any).lineItems
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
                          {items.map((item: PurchaseOrderLineItem, i: number) => (
                            <Box key={item.id ?? i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: i < items.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                              <Box>
                                <Typography variant='body1' fontWeight={500}>{item.description}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Qty: {item.quantity} × {fmtMoney(item.unitPrice)}
                                  {item.unit && <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>· {item.unit}</Typography>}
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
                  {resolvedPO.vendorMessage && (
                    <Box>
                      <SectionHeader>Vendor Message</SectionHeader>
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', border: 1, borderColor: 'info.main', borderRadius: 2 }}>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{resolvedPO.vendorMessage}</Typography>
                      </Box>
                    </Box>
                  )}

                  <Box>
                    <SectionHeader>Notes</SectionHeader>
                    {!resolvedPO.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>No notes provided.</Typography>
                    )}
                    {resolvedPO.notes && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main', borderRadius: 2 }}>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{resolvedPO.notes}</Typography>
                      </Box>
                    )}
                  </Box>

                  <Box>
                    <Accordion expanded={expandedSections.gallery} onChange={() => setExpandedSections(p => ({ ...p, gallery: !p.gallery }))} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                      <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ p: 0, minHeight: 'auto', '& .MuiAccordionSummary-content': { my: 0 } }}>
                        <SectionHeader>Gallery</SectionHeader>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0, pt: 2 }}>
                        <PhotoGallerySection entityId={resolvedPO.id} entityType="purchaseOrder" />
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                </Box>
              </Box>
            </Panel>
          </PanelGroup>
        ) : null}
      </DialogContent>

      {/* FOOTER */}
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'center' }}>
        <AuditFooter creAt={resolvedPO?.creAt} creBy={resolvedPO?.creBy} modAt={resolvedPO?.modAt} modBy={resolvedPO?.modBy} divider={false} />
      </DialogActions>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} disableEnforceFocus PaperProps={{ sx: { minWidth: 400 } }}>
        <DialogTitle>Delete Purchase Order?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this purchase order? This action cannot be undone.</DialogContentText>
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
