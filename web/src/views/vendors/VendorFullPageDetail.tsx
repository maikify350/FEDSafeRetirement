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
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'

import AuditFooter from '@/components/AuditFooter'
import SectionHeader from '@/components/SectionHeader'
import ContactLink from '@/components/ContactLink'
import PhotoGallerySection from '@/components/PhotoGallerySection'
import VendorEditPanel from './VendorEditPanel'

import type { Vendor } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


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
  vendor?: Vendor
  vendorId?: string | null
  initialEditing?: boolean
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
 * Full-page vendor detail with contact info, addresses, purchase order history, and photos.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/vendors/VendorFullPageDetail.tsx
 */
export default function VendorFullPageDetail({ open, onClose, onEdit, vendor, vendorId, initialEditing }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: fetchedVendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => api.get<Vendor>(`/api/vendors/${vendorId}`),
    enabled: !!vendorId && !vendor
  })
  const resolvedVendor = vendor || fetchedVendor

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
      const response = await fetch(`${BACKEND}/api/reports/vendor/${resolvedVendor?.id}?format=pdf`, {
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
    gallery: false
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/vendors/${resolvedVendor?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      onClose()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      if (error?.response?.status === 409 && errorData?.error) {
        alert(errorData.error)
      } else {
        alert('Failed to delete vendor.')
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

  const displayName = !resolvedVendor ? 'Add Vendor' : isEditing ? 'Edit Vendor' : (resolvedVendor.company || resolvedVendor.name || 'Vendor Details')

  if (vendorLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth={false} hideBackdrop disableScrollLock disableEnforceFocus transitionDuration={0} PaperComponent={PaperComponent} sx={{ pointerEvents: 'none' }} PaperProps={{ sx: { width: '60vw', maxWidth: 'none', height: '90vh', maxHeight: 'none', m: 0, borderRadius: 2 } }}>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={() => (isEditing && resolvedVendor) ? setIsEditing(false) : onClose()}
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
              {displayName}
            </Typography>
            <Box className="flex items-center gap-2 mt-0.5">
              {resolvedVendor?.inactive && <Chip label='Inactive' size='small' color='error' variant='tonal' />}
              {resolvedVendor?.tax1099 && <Chip label='1099' size='small' color='info' variant='tonal' />}
              {resolvedVendor?.paymentTerms && <Chip label={resolvedVendor.paymentTerms} size='small' variant='tonal' color='secondary' />}
            </Box>
          </Box>
        </Box>
        <Box className="flex items-center gap-2">
          {isEditing ? (
            <>
              {resolvedVendor && (
                <Tooltip title="Delete Vendor">
                  <IconButton onClick={() => setDeleteDialogOpen(true)} disabled={editState.isSaving} sx={{ color: 'error.main', bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}>
                    <i className="tabler-trash text-[28px]" />
                  </IconButton>
                </Tooltip>
              )}
              <Button variant="outlined" onClick={() => resolvedVendor ? setIsEditing(false) : onClose()} disabled={editState.isSaving} sx={{ borderRadius: '8px' }}>Cancel</Button>
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
          <IconButton onClick={() => (isEditing && resolvedVendor) ? setIsEditing(false) : onClose()} disabled={editState.isSaving}>
            <i className="tabler-x" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* CONTENT (Resizable Panels) */}
      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <VendorEditPanel
            vendorId={resolvedVendor?.id || null}
            open={true}
            onClose={() => resolvedVendor ? setIsEditing(false) : onClose()}
            onSaved={() => resolvedVendor ? setIsEditing(false) : onClose()}
            inline={true}
            registerSave={(fn: any) => { saveFuncRef.current = fn }}
            onStateChange={setEditState}
          />
        ) : resolvedVendor ? (
          <PanelGroup direction="horizontal">
            {/* LEFT SECTION (70%) */}
            <Panel defaultSize={70} minSize={40}>
              <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
                <SectionHeader>Basic Information</SectionHeader>
                <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                  <DetailRow label='Company Name' value={resolvedVendor.company} icon='tabler-building-skyscraper' />
                  <DetailRow label='Contact Name' value={resolvedVendor.name} icon='tabler-user' />
                  <DetailRow label='Website' value={
                    resolvedVendor.webUrl ? <ContactLink type='url' value={resolvedVendor.webUrl} /> : null
                  } icon='tabler-world' />
                </Box>

                {/* Contact Information */}
                {(resolvedVendor.phone || resolvedVendor.email) && (
                  <>
                    <SectionHeader>Contact Information</SectionHeader>
                    <Box className='rounded-2xl overflow-hidden mb-6' sx={{ border: 1, borderColor: 'divider' }}>
                      <DetailRow label='Phone' value={
                        resolvedVendor.phone ? <ContactLink type='phone' value={resolvedVendor.phone} /> : null
                      } icon='tabler-phone' />
                      <DetailRow label='Email' value={
                        resolvedVendor.email ? <ContactLink type='email' value={resolvedVendor.email} /> : null
                      } icon='tabler-mail' />
                    </Box>
                  </>
                )}

                {/* Addresses */}
                {(resolvedVendor as any).addresses && (resolvedVendor as any).addresses.length > 0 && (
                  <>
                    <SectionHeader>Addresses ({(resolvedVendor as any).addresses.length})</SectionHeader>
                    <Box className='mb-6' sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {(resolvedVendor as any).addresses.map((address: any) => (
                        <Box key={address.id} className='rounded-2xl overflow-hidden' sx={{ border: 1, borderColor: 'divider' }}>
                          <Box className='flex items-center justify-between px-4 py-2' sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                            <Box className='flex items-center gap-2'>
                              {address.isDefault && <i className='tabler-star-filled text-base' style={{ color: COLORS.warning }} />}
                              <Typography variant='caption' color='primary' sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                                {address.addressType || 'Address'}
                                {address.isDefault && ' • Default'}
                              </Typography>
                            </Box>
                            <Box className='flex items-center gap-1'>
                              <IconButton
                                size='small'
                                onClick={() => {
                                  const location = [address.city, address.state].filter(Boolean).join(', ')
                                  if (location) window.open(`https://forecast.weather.gov/zipcity.php?inputstring=${encodeURIComponent(location)}`, '_blank')
                                }}
                                sx={{ bgcolor: 'action.selected', color: 'text.primary', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }}
                              >
                                <i className='tabler-cloud text-base' />
                              </IconButton>
                              <IconButton
                                size='small'
                                onClick={() => {
                                  const parts = [address.street, address.street2, [address.city, address.state].filter(Boolean).join(', '), address.zipCode].filter(Boolean)
                                  window.open(`https://earth.google.com/web/search/${encodeURIComponent(parts.join(', '))}`, '_blank')
                                }}
                                sx={{ bgcolor: 'action.selected', color: 'text.primary', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }}
                              >
                                <i className='tabler-world text-base' />
                              </IconButton>
                              <IconButton
                                size='small'
                                onClick={() => {
                                  const parts = [address.street, address.street2, [address.city, address.state].filter(Boolean).join(', '), address.zipCode].filter(Boolean)
                                  window.open(`https://maps.google.com/?q=${encodeURIComponent(parts.join(', '))}`, '_blank')
                                }}
                                sx={{ bgcolor: 'action.selected', color: 'text.primary', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }}
                              >
                                <i className='tabler-map-pin text-base' />
                              </IconButton>
                            </Box>
                          </Box>
                          <Box className='px-4 py-3'>
                            <Typography variant='body2'>{address.street}</Typography>
                            {address.street2 && <Typography variant='body2'>{address.street2}</Typography>}
                            <Typography variant='body2'>
                              {[address.city, address.state, address.zipCode].filter(Boolean).join(', ')}
                            </Typography>
                            {address.country && address.country !== 'United States' && (
                              <Typography variant='body2' color='text.secondary' sx={{ fontSize: '0.875rem', mt: 0.25 }}>
                                {address.country}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}

                {/* Optional Expand / Collapse (e.g., if there's extensive notes or line items down the line) */}
                <Box className='flex justify-end gap-2 mb-4'>
                  <Button variant='outlined' size='small' onClick={() => setExpandedSections({ gallery: true })}>Expand All</Button>
                  <Button variant='outlined' size='small' onClick={() => setExpandedSections({ gallery: false })}>Collapse All</Button>
                </Box>
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
                      <Button
                        variant='contained' size='large'
                        startIcon={<i className='tabler-shopping-cart' />}
                        onClick={() => router.push(`/purchase-orders?add=1&vendorId=${resolvedVendor.id}${(resolvedVendor as any).taxCodeId ? `&taxCodeId=${(resolvedVendor as any).taxCodeId}` : ''}`)}
                        sx={{ py: 1.5, fontSize: '1rem', justifyContent: 'flex-start', bgcolor: 'var(--color-action-po)', '&:hover': { bgcolor: 'var(--color-action-po-hover)' } }}
                      >
                        Create Purchase Order
                      </Button>
                    </Box>
                  </Box>

                   <Box>
                    <SectionHeader>Internal Notes</SectionHeader>
                    {(!resolvedVendor.notes) && (
                       <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>No notes provided.</Typography>
                    )}
                    {resolvedVendor.notes && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main', borderRadius: 2 }}>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{resolvedVendor.notes}</Typography>
                      </Box>
                    )}
                  </Box>

                  <Box>
                    <Accordion expanded={expandedSections.gallery} onChange={() => setExpandedSections(p => ({ ...p, gallery: !p.gallery }))} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                      <AccordionSummary expandIcon={<i className='tabler-chevron-down text-base' />} sx={{ p: 0, minHeight: 'auto', '& .MuiAccordionSummary-content': { my: 0 } }}>
                         <SectionHeader>Gallery</SectionHeader>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0, pt: 2 }}>
                        <PhotoGallerySection entityId={resolvedVendor.id} entityType="vendor" />
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
      {resolvedVendor && (
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'center' }}>
          <AuditFooter creAt={resolvedVendor.creAt} creBy={resolvedVendor.creBy} modAt={resolvedVendor.modAt} modBy={resolvedVendor.modBy} divider={false} />
        </DialogActions>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} disableEnforceFocus PaperProps={{ sx: { minWidth: 400 } }}>
        <DialogTitle>Delete Vendor?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this vendor? This action cannot be undone.</DialogContentText>
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
