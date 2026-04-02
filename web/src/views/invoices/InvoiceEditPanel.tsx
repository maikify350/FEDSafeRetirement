'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Tooltip from '@mui/material/Tooltip'
import EditPanel from '@/components/EditPanel'
import CustomTextField from '@core/components/mui/TextField'
import SectionHeader from '@/components/SectionHeader'
import DictationButton from '@/components/DictationButton'
import NotesEditorModal from '@/components/NotesEditorModal'
import AddressSelectionDialog from '@/components/AddressSelectionDialog'
import LineItemsSection, { type LineItemEntry, emptyLineItem } from '@/components/LineItemsSection'
import { api } from '@/lib/api'
import { useRequiredFieldsValidation } from '@/hooks/useRequiredFields'
import type { Invoice, InvoiceLineItem } from '@shared/contracts'

type LookupItem  = { id: string; value: string; label?: string; isDefault?: boolean; abbreviation?: string }
type TaxCode     = { id: string; code: string; name: string; rate: number }
type ClientItem  = { id: string; firstName?: string; lastName?: string; company?: string; useCompanyName?: boolean; addresses?: ClientAddress[] }
type ClientAddress = { id: string; street?: string; street2?: string; city?: string; state?: string; stateId?: string; zipCode?: string; addressType?: string }
type UserItem    = { id: string; name: string }
type StatusDef   = { id: string; status: string; enabledForInvoice?: boolean }


function clientLabel(c: ClientItem) {
  return c.useCompanyName && c.company
    ? c.company
    : `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || '—'
}


interface InvoiceEditPanelProps {
  invoiceId: string | null
  open: boolean
  onClose: () => void
  onSaved: () => void
  inline?: boolean
  registerSave?: (saveFn: () => void) => void
  onStateChange?: (state: { isSaving: boolean; isValid: boolean }) => void
  initialClientId?: string | null    // Auto-select client (from Client detail "Create Invoice" button)
  initialJobId?: string | null       // Pre-populate all fields from job (from Job detail "Create Invoice" button)
  initialQuoteId?: string | null     // Pre-populate all fields from quote (from Quote detail "Convert to Invoice" button)
  initialRequestId?: string | null   // Pre-populate all fields from request (from Request detail "Create Invoice" button)
  initialTaxCodeId?: string | null   // Auto-select tax code (from Client detail)
}

/**
 * Full-screen edit drawer for Invoice entity with pricing, payment terms, and line items.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/invoices/InvoiceEditPanel.tsx
 */
export default function InvoiceEditPanel({ invoiceId, open, onClose, onSaved, inline, registerSave, onStateChange, initialClientId, initialJobId, initialQuoteId, initialRequestId, initialTaxCodeId }: InvoiceEditPanelProps) {
  const queryClient = useQueryClient()

  const { data: invoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => api.get<Invoice>(`/api/invoices/${invoiceId}`),
    enabled: !!invoiceId && open
  })

  // Fetch source job to copy details (new invoice from job only)
  const { data: sourceJob } = useQuery({
    queryKey: ['job', initialJobId],
    queryFn: () => api.get<any>(`/api/jobs/${initialJobId}`),
    enabled: !!initialJobId && !invoiceId && open
  })

  // Fetch source quote to copy details (new invoice from quote only)
  const { data: sourceQuote } = useQuery({
    queryKey: ['quote', initialQuoteId],
    queryFn: () => api.get<any>(`/api/quotes/${initialQuoteId}`),
    enabled: !!initialQuoteId && !invoiceId && open
  })

  // Fetch source request to copy details (new invoice from request only)
  const { data: sourceRequest } = useQuery({
    queryKey: ['request', initialRequestId],
    queryFn: () => api.get<any>(`/api/requests/${initialRequestId}`),
    enabled: !!initialRequestId && !invoiceId && open
  })

  // Lookups
  const { data: clients = [] }      = useQuery<ClientItem[]>({ queryKey: ['clients-list'], queryFn: () => api.get('/api/clients') })
  const { data: taxCodes = [] }     = useQuery<TaxCode[]>({ queryKey: ['tax-codes'], queryFn: () => api.get('/api/tax-codes?activeOnly=true') })
  const { data: paymentTerms = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'paymentTerms'], queryFn: () => api.get('/api/lookups/paymentTerms') })
  const { data: jobTypes = [] }     = useQuery<LookupItem[]>({ queryKey: ['lookups', 'jobType'], queryFn: () => api.get('/api/lookups/jobType') })
  const { data: users = [] }        = useQuery<UserItem[]>({ queryKey: ['users-list'], queryFn: () => api.get('/api/users') })
  const { data: usStates = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'usState'], queryFn: () => api.get('/api/lookups/usState') })
  const { data: canadianProvinces = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'canadianProvince'], queryFn: () => api.get('/api/lookups/canadianProvince') })
  const { data: mexicanStates = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'mexicanState'], queryFn: () => api.get('/api/lookups/mexicanState') })
  const { data: countries = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'country'], queryFn: () => api.get('/api/lookups/country') })
  const { data: statusDefsRaw = [] } = useQuery<{ data: StatusDef[] }>({
    queryKey: ['status-definitions'],
    queryFn: () => api.get('/api/status-definitions')
  })
  const statusDefs = (statusDefsRaw as any)?.data ?? statusDefsRaw as StatusDef[]
  const invoiceStatuses = (statusDefs as StatusDef[]).filter(s => s.enabledForInvoice !== false)

  // Form state — Invoice Details
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId]           = useState('')
  const [clientId, setClientId]       = useState('')
  const [jobTypeId, setJobTypeId]     = useState('')
  const [issueDate, setIssueDate]     = useState('')
  const [dueDate, setDueDate]         = useState('')
  const [paidAt, setPaidAt]           = useState('')
  const [taxCodeId, setTaxCodeId]     = useState('')
  const [paymentTermsId, setPaymentTermsId] = useState('')
  const [assignedToId, setAssignedToId]     = useState('')
  const [amountPaid, setAmountPaid]   = useState('')

  // Property/Location
  const [propertyName, setPropertyName]         = useState('')
  const [propertyStreet, setPropertyStreet]     = useState('')
  const [propertyStreet2, setPropertyStreet2]   = useState('')
  const [propertyCity, setPropertyCity]         = useState('')
  const [propertyState, setPropertyState]       = useState('')
  const [propertyZipCode, setPropertyZipCode]   = useState('')
  const [propertyCountry, setPropertyCountry]   = useState('')

  // ── Property Address Helpers ─────────────────────────────────────────────
  const getStateLabel = (): string => {
    const country = countries.find(c => c.id === propertyCountry)
    const v = country?.value ?? ''
    if (v === 'CA' || v === 'Canada') return 'Province'
    return 'State'
  }

  const getStatesForCountry = (): LookupItem[] => {
    const country = countries.find(c => c.id === propertyCountry)
    const v = country?.value ?? ''
    if (v === 'CA' || v === 'Canada') return canadianProvinces
    if (v === 'MX' || v === 'Mexico') return mexicanStates
    return usStates // default: US
  }

  // Discount
  const [discountType, setDiscountType]   = useState<'percent' | 'amount' | ''>('')
  const [discountValue, setDiscountValue] = useState('')

  // Line items
  const [lineItems, setLineItems] = useState<LineItemEntry[]>([])

  // Notes
  const [notes, setNotes]         = useState('')
  const [notesModalOpen, setNotesModalOpen] = useState(false)

  // Address selection (mobile parity)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [addressPickerOpen, setAddressPickerOpen] = useState(false)
  const [selectedClientForPicker, setSelectedClientForPicker] = useState<ClientItem | null>(null)

  // ── Pricing Calculations ─────────────────────────────────────────────────
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
  const discount = discountType === 'percent'
    ? subtotal * ((Number(discountValue) || 0) / 100)
    : discountType === 'amount'
      ? Number(discountValue) || 0
      : 0
  const afterDiscount = subtotal - discount
  const selectedTaxCode = taxCodes.find(tc => tc.id === taxCodeId)
  const taxRate = selectedTaxCode?.rate || 0
  const tax = afterDiscount * (taxRate / 100)
  const total = afterDiscount + tax

  // Dynamic Validation (driven by required-fields config)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const { validate, isRequired } = useRequiredFieldsValidation('invoice')

  const validationResult = useMemo(() => {
    if (!submitAttempted) return { valid: true, errors: [], fieldErrors: {} }
    return validate({
      clientId, dueDate,
      lineItems: lineItems.filter(li => li.description.trim()),
    })
  }, [submitAttempted, validate, clientId, dueDate, lineItems])

  const clientError = validationResult.fieldErrors['clientId'] || ''
  const isFormValid = validationResult.valid

  // Populate form
  useEffect(() => {
    if (invoice) {
      setTitle(invoice.title || '')
      setDescription(invoice.description || '')
      setStatusId((invoice as any).statusId || '')
      setClientId((invoice as any).clientId || '')
      setJobTypeId((invoice as any).jobTypeId || '')
      setIssueDate(invoice.issueDate?.split('T')[0] || '')
      setDueDate(invoice.dueDate?.split('T')[0] || '')
      setPaidAt(invoice.paidAt?.split('T')[0] || '')
      setTaxCodeId((invoice as any).taxCodeId || '')
      setPaymentTermsId((invoice as any).paymentTermsId || '')
      setAssignedToId((invoice as any).assignedToId || '')
      setLocationId((invoice as any).locationId || null)
      setAmountPaid(invoice.amountPaid != null ? String(invoice.amountPaid) : '')
      setPropertyName(invoice.propertyName || '')
      setPropertyStreet(invoice.propertyStreet || '')
      setPropertyStreet2(invoice.propertyStreet2 || '')
      setPropertyCity(invoice.propertyCity || '')
      setPropertyState(invoice.propertyState || '')
      setPropertyZipCode(invoice.propertyZipCode || '')
      setDiscountType((invoice.discountType as any) || '')
      setDiscountValue(invoice.discountValue != null ? String(invoice.discountValue) : '')
      setNotes(invoice.notes || '')
      if (invoice.lineItems && invoice.lineItems.length > 0) {
        setLineItems(invoice.lineItems.map((li: InvoiceLineItem) => ({
          id: li.id,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxable: false,
          serviceItemId: null,
          unitId: null,
        })))
      } else {
        setLineItems([])
      }
    } else if (!invoiceId && open) {
      setTitle(''); setDescription(''); setStatusId(''); setClientId('')
      setJobTypeId(''); setIssueDate(new Date().toISOString().split('T')[0])
      setDueDate(''); setPaidAt(''); setTaxCodeId(''); setAssignedToId('')
      setAmountPaid(''); setPropertyName(''); setPropertyStreet('')
      setPropertyStreet2(''); setPropertyCity(''); setPropertyState('')
      setPropertyZipCode(''); setPropertyCountry(''); setDiscountType(''); setDiscountValue(''); setNotes('')
      setLineItems([])
    }
    setSubmitAttempted(false)
  }, [invoice, invoiceId, open])

  // Set default payment terms once lookup data loads (separate from reset to avoid re-triggering)
  useEffect(() => {
    if (!invoiceId && open && !invoice && paymentTerms.length > 0) {
      setPaymentTermsId(prev => {
        if (prev) return prev
        const def = paymentTerms.find(p => p.isDefault)
        return def ? def.id : prev
      })
    }
  }, [paymentTerms, invoiceId, open, invoice])

  // Auto-select client when coming from Client detail "Create Invoice" button
  // Guard: only set after clients list is loaded to avoid MUI out-of-range loop
  useEffect(() => {
    if (!invoiceId && open && initialClientId && clients.length > 0 && !clientId) {
      setClientId(initialClientId)
    }
  }, [initialClientId, invoiceId, open, clientId, clients])

  // Auto-set tax code when coming from Client detail
  // Guard: only set after taxCodes list is loaded to avoid MUI out-of-range loop
  useEffect(() => {
    if (!invoiceId && open && initialTaxCodeId && taxCodes.length > 0 && !taxCodeId) {
      setTaxCodeId(initialTaxCodeId)
    }
  }, [initialTaxCodeId, invoiceId, open, taxCodeId, taxCodes])

  // Pre-populate all fields from source job (Create Invoice from Job)
  useEffect(() => {
    if (!invoiceId && open && sourceJob) {
      setTitle(sourceJob.title || '')
      setDescription(sourceJob.description || '')
      setClientId(sourceJob.clientId || '')
      setJobTypeId(sourceJob.jobTypeId || '')
      setTaxCodeId(sourceJob.taxCodeId || '')
      setAssignedToId(sourceJob.assignedToId || '')
      setPropertyName(sourceJob.propertyName || '')
      setPropertyStreet(sourceJob.propertyStreet || '')
      setPropertyStreet2(sourceJob.propertyStreet2 || '')
      setPropertyCity(sourceJob.propertyCity || '')
      setPropertyState(sourceJob.propertyState || '')
      setPropertyZipCode(sourceJob.propertyZipCode || '')
      setDiscountType(sourceJob.discountType || '')
      setDiscountValue(sourceJob.discountValue != null ? String(sourceJob.discountValue) : '')

      // Copy line items (strip IDs so they're created fresh)
      if (sourceJob.lineItems?.length > 0) {
        setLineItems(sourceJob.lineItems.map((li: any) => ({
          description: li.description,
          quantity: li.quantity ?? 1,
          unitPrice: li.unitPrice ?? 0,
          taxable: li.taxable ?? false,
          serviceItemId: li.serviceItemId ?? null,
          unitId: li.unitId ?? null,
        })))
      }

      // Set issue date to today and calculate due date from default payment terms
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      setIssueDate(todayStr)

      const defaultPT = paymentTerms.find(p => p.isDefault)
      if (defaultPT) {
        setPaymentTermsId(defaultPT.id)
        // Handle "Due on receipt" - set due date to issue date (0 days)
        if (defaultPT.value?.toLowerCase().includes('receipt')) {
          setDueDate(todayStr)
        } else {
          // Try to parse days from payment term value (e.g., "Net 30" → 30 days)
          const daysMatch = defaultPT.value?.match(/\d+/)
          if (daysMatch) {
            const days = parseInt(daysMatch[0], 10)
            const due = new Date(today)
            due.setDate(due.getDate() + days)
            setDueDate(due.toISOString().split('T')[0])
          } else {
            // Default to due on receipt if no days found
            setDueDate(todayStr)
          }
        }
      }
    }
  }, [sourceJob, invoiceId, open, paymentTerms])

  // Pre-populate all fields from source quote (Convert to Invoice from Quote)
  useEffect(() => {
    if (!invoiceId && open && sourceQuote) {
      setTitle(sourceQuote.title || '')
      setClientId(sourceQuote.clientId || '')
      setJobTypeId(sourceQuote.jobTypeId || '')
      setTaxCodeId(sourceQuote.taxCodeId || '')
      setAssignedToId(sourceQuote.assignedToId || '')
      setPropertyName(sourceQuote.propertyName || '')
      setPropertyStreet(sourceQuote.propertyStreet || '')
      setPropertyStreet2(sourceQuote.propertyStreet2 || '')
      setPropertyCity(sourceQuote.propertyCity || '')
      setPropertyState(sourceQuote.propertyState || '')
      setPropertyZipCode(sourceQuote.propertyZipCode || '')
      setDiscountType(sourceQuote.discountType || '')
      setDiscountValue(sourceQuote.discountValue != null ? String(sourceQuote.discountValue) : '')
      setDescription(sourceQuote.description || '')
      setNotes(sourceQuote.notes || '')

      // Copy line items (strip IDs so they're created fresh)
      if (sourceQuote.lineItems?.length > 0) {
        setLineItems(sourceQuote.lineItems.map((li: any) => ({
          description: li.description,
          quantity: li.quantity ?? 1,
          unitPrice: li.unitPrice ?? 0,
          taxable: li.taxable ?? false,
          serviceItemId: li.serviceItemId ?? null,
          unitId: li.unitId ?? null,
        })))
      }

      // Set issue date to today
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      setIssueDate(todayStr)

      // Calculate due date from quote's payment terms (or client's default)
      const quotePT = sourceQuote.paymentTermsId
        ? paymentTerms.find((p: LookupItem) => p.id === sourceQuote.paymentTermsId)
        : paymentTerms.find((p: LookupItem) => p.isDefault)
      if (quotePT) {
        setPaymentTermsId(quotePT.id)
        const daysMatch = quotePT.value?.match(/\d+/)
        if (daysMatch) {
          const days = parseInt(daysMatch[0], 10)
          const due = new Date(today)
          due.setDate(due.getDate() + days)
          setDueDate(due.toISOString().split('T')[0])
        }
      }
    }
  }, [sourceQuote, invoiceId, open, paymentTerms])

  // Pre-populate all fields from source request (Create Invoice from Request)
  useEffect(() => {
    if (!invoiceId && open && sourceRequest) {
      setTitle(sourceRequest.title || '')
      setClientId(sourceRequest.clientId || '')
      setTaxCodeId(sourceRequest.taxCodeId || '')
      setAssignedToId(sourceRequest.assignedToId || '')
      setDescription(sourceRequest.description || '')
      setNotes(sourceRequest.customerMessage || '')
      // Copy address (request uses street/city/zipCode, invoice uses propertyStreet/propertyCity/propertyZipCode)
      setPropertyName(sourceRequest.propertyName || '')
      setPropertyStreet(sourceRequest.street || '')
      setPropertyStreet2(sourceRequest.street2 || '')
      setPropertyCity(sourceRequest.city || '')
      setPropertyState(sourceRequest.stateId || '')
      setPropertyZipCode(sourceRequest.zipCode || '')
      // Copy line items (strip IDs so they're created fresh)
      if (sourceRequest.lineItems?.length > 0) {
        setLineItems(sourceRequest.lineItems.map((li: any) => ({
          description: li.description,
          quantity: li.quantity ?? 1,
          unitPrice: li.unitPrice ?? 0,
          taxable: li.taxable ?? false,
          serviceItemId: li.serviceItemId ?? null,
          unitId: li.unitId ?? null,
        })))
      }
      // Set issue date to today and calculate due date from default payment terms
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      setIssueDate(todayStr)
      const defaultPT = paymentTerms.find((p: any) => p.isDefault)
      if (defaultPT) {
        setPaymentTermsId(defaultPT.id)
        const daysMatch = defaultPT.value?.match(/\d+/)
        if (daysMatch) {
          const days = parseInt(daysMatch[0], 10)
          const due = new Date(today)
          due.setDate(due.getDate() + days)
          setDueDate(due.toISOString().split('T')[0])
        }
      }
    }
  }, [sourceRequest, invoiceId, open, paymentTerms])

  // Show address picker when client changes (create mode only, mobile parity)
  // Skip when converting from a quote, job, or request — address is already copied
  useEffect(() => {
    if (!invoiceId && open && clientId && clients.length > 0 && !initialQuoteId && !initialJobId && !initialRequestId) {
      const client = clients.find(c => c.id === clientId)
      if (client && client.addresses && client.addresses.length > 0) {
        setSelectedClientForPicker(client)
        setAddressPickerOpen(true)
      }
    }
  }, [clientId, clients, invoiceId, open])

  // Auto-set payment terms from client's default when client is selected
  useEffect(() => {
    if (!invoiceId && open && clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId)
      if (client && (client as any).paymentTermsId) {
        setPaymentTermsId((client as any).paymentTermsId)
      }
    }
  }, [clientId, clients, invoiceId, open])

  // Auto-calculate due date when payment terms or issue date changes
  useEffect(() => {
    if (open && paymentTermsId && issueDate) {
      const selectedPT = paymentTerms.find(pt => pt.id === paymentTermsId)
      if (selectedPT) {
        const issueD = new Date(issueDate)
        // Handle "Due on receipt" - set due date to issue date (0 days)
        if (selectedPT.value?.toLowerCase().includes('receipt')) {
          setDueDate(issueDate)
        } else {
          // Parse days from payment term value (e.g., "Net 30" → 30 days)
          const daysMatch = selectedPT.value?.match(/\d+/)
          if (daysMatch) {
            const days = parseInt(daysMatch[0], 10)
            const due = new Date(issueD)
            due.setDate(due.getDate() + days)
            setDueDate(due.toISOString().split('T')[0])
          } else {
            // Default to due on receipt if no days found
            setDueDate(issueDate)
          }
        }
      }
    }
  }, [paymentTermsId, issueDate, paymentTerms, open])

  // Auto-select first tax code when creating new invoice from scratch
  useEffect(() => {
    if (!invoiceId && open && !taxCodeId && taxCodes.length > 0 && !initialQuoteId && !initialJobId && !initialRequestId) {
      setTaxCodeId(taxCodes[0].id)
    }
  }, [taxCodes, taxCodeId, invoiceId, open, initialQuoteId, initialJobId, initialRequestId])

  const handleAddressSelected = (addressId: string | null, addressData: ClientAddress | null) => {
    if (addressData) {
      setLocationId(addressId)
      setPropertyStreet(addressData.street || '')
      setPropertyStreet2(addressData.street2 || '')
      setPropertyCity(addressData.city || '')
      setPropertyZipCode(addressData.zipCode || '')
      // Use stateId (UUID) directly if available, else resolve abbreviation
      if (addressData.stateId) {
        setPropertyState(addressData.stateId)
      } else {
        const stateAbbr = addressData.state || ''
        const stateList = getStatesForCountry()
        const matchedState = stateList.find(s => s.value === stateAbbr || s.abbreviation === stateAbbr || s.label === stateAbbr)
        setPropertyState(matchedState?.id || '')
      }
      // Set default US country if not set
      if (!propertyCountry) {
        const defaultCountry = countries.find(c => c.value === 'US' || c.value === 'United States')
        if (defaultCountry) setPropertyCountry(defaultCountry.id)
      }
    } else {
      setLocationId(null)
    }
  }

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      invoiceId ? api.patch(`/api/invoices/${invoiceId}`, data) : api.post('/api/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      if (invoiceId) queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onSaved()
    }
  })

  const handleSave = () => {
    setSubmitAttempted(true)
    if (!isFormValid) return

    const validLineItems = lineItems.filter(li => li.description.trim())

    saveMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      statusId: statusId || undefined,
      clientId,
      jobTypeId: jobTypeId || undefined,
      issueDate: issueDate || undefined,
      dueDate: dueDate || undefined,
      paidAt: paidAt || undefined,
      taxCodeId: taxCodeId || undefined,
      taxRate: taxRate || undefined,
      paymentTermsId: paymentTermsId || undefined,
      assignedToId: assignedToId || undefined,
      // locationId: locationId || undefined, // TODO: Uncomment after running migration
      amountPaid: amountPaid ? parseFloat(amountPaid) : undefined,
      propertyName: propertyName.trim() || undefined,
      propertyStreet: propertyStreet.trim() || undefined,
      propertyStreet2: propertyStreet2.trim() || undefined,
      propertyCity: propertyCity.trim() || undefined,
      propertyStateId: propertyState || undefined,
      propertyZipCode: propertyZipCode.trim() || undefined,
      discountType: discountType || undefined,
      discountValue: discountValue ? Number(discountValue) : undefined,
      notes: notes.trim() || undefined,
      lineItems: validLineItems.map(li => ({
        id: li.id,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        taxable: li.taxable,
        serviceItemId: li.serviceItemId || null,
        unitId: li.unitId || null,
      })),
    })
  }

  const isLoading = isLoadingInvoice && !!invoiceId

  useEffect(() => {
    if (registerSave) registerSave(handleSave)
  }, [
    registerSave, title, description, status, clientId, jobTypeId, issueDate, dueDate, paidAt, taxCodeId, paymentTermsId, assignedToId, amountPaid,
    propertyName, propertyStreet, propertyStreet2, propertyCity, propertyState, propertyZipCode, discountType, discountValue, notes, lineItems
  ])

  useEffect(() => {
    if (onStateChange) onStateChange({ isSaving: saveMutation.isPending, isValid: isFormValid })
  }, [onStateChange, saveMutation.isPending, isFormValid])

  const formContent = (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!isLoading && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: inline ? 3 : '4px', py: inline ? 2 : '2px', '& .MuiFormControl-root': { mt: '2px', mb: 0 } }}>

          {/* ── Invoice Details ─────────────────────────────────── */}
          <SectionHeader>Invoice Details</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>

              <CustomTextField
                fullWidth label='Title' value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='e.g. HVAC Service, Kitchen Renovation...'
              />

              <Autocomplete
                options={clients}
                getOptionLabel={(option) => clientLabel(option)}
                value={clients.find(c => c.id === clientId) || null}
                onChange={(_e, newValue) => setClientId(newValue?.id || '')}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={(options, { inputValue }) => {
                  const q = inputValue.toLowerCase()
                  return options.filter(c => clientLabel(c).toLowerCase().includes(q))
                }}
                renderInput={(params) => (
                  <CustomTextField
                    {...params}
                    fullWidth
                    label='Client'
                    required={isRequired('clientId')}
                    error={!!clientError}
                    helperText={clientError}
                    placeholder='Search by name or company...'
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {clientLabel(option)}
                  </li>
                )}
                size='small'
                noOptionsText='No clients found'
              />

              {/* Status | Job Type */}
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0, overflow: 'hidden' }}>
                  <CustomTextField select fullWidth label='Status' value={statusId} onChange={e => setStatusId(e.target.value)}>
                    {invoiceStatuses.length > 0
                      ? invoiceStatuses.map(s => <MenuItem key={s.id} value={s.id}>{s.status}</MenuItem>)
                      : ['Draft', 'Sent', 'Viewed', 'Partial', 'Paid', 'Overdue', 'Void'].map(s => (
                          <MenuItem key={s} value={s.toLowerCase()}>{s}</MenuItem>
                        ))
                    }
                  </CustomTextField>
                </Box>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0, overflow: 'hidden' }}>
                  <CustomTextField select fullWidth label='Job Type' value={jobTypeId} onChange={e => setJobTypeId(e.target.value)}>
                    <MenuItem value=''>None</MenuItem>
                    {jobTypes.map(jt => <MenuItem key={jt.id} value={jt.id}>{jt.value}</MenuItem>)}
                  </CustomTextField>
                </Box>
              </Box>

              {/* Issue Date | Due Date */}
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: 1 }}>
                  <CustomTextField fullWidth type='date' label='Issue Date' value={issueDate}
                    onChange={e => setIssueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <CustomTextField fullWidth type='date' label='Due Date' value={dueDate}
                    onChange={e => setDueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Box>
              </Box>

              {/* Tax Code | Payment Terms */}
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0 }}>
                  <CustomTextField select fullWidth label='Tax Code' value={taxCodeId} onChange={e => setTaxCodeId(e.target.value)}>
                    <MenuItem value=''>None</MenuItem>
                    {taxCodes.map(tc => <MenuItem key={tc.id} value={tc.id}>{tc.code} – {tc.name} ({tc.rate}%)</MenuItem>)}
                  </CustomTextField>
                </Box>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0 }}>
                  <CustomTextField select fullWidth label='Payment Terms' value={paymentTermsId} onChange={e => setPaymentTermsId(e.target.value)}>
                    <MenuItem value=''>None</MenuItem>
                    {paymentTerms.map(p => <MenuItem key={p.id} value={p.id}>{p.label || p.value}</MenuItem>)}
                  </CustomTextField>
                </Box>
              </Box>

              {/* Assigned To */}
              <CustomTextField select fullWidth label='Assigned To' value={assignedToId} onChange={e => setAssignedToId(e.target.value)}>
                <MenuItem value=''>Unassigned</MenuItem>
                {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </CustomTextField>
            </Box>
          </Box>

          {/* ── Description ─────────────────────────────────────── */}
          <SectionHeader>Description</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <CustomTextField fullWidth multiline minRows={3} label='Description' value={description}
              onChange={e => setDescription(e.target.value)} placeholder='Describe the work performed...' />
          </Box>

          {/* ── Job Location ─────────────────────────────────────── */}
          <SectionHeader>Job Location (Optional)</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <CustomTextField fullWidth label='Property Name' value={propertyName} onChange={e => setPropertyName(e.target.value)} placeholder='e.g. Main Office' />
              <CustomTextField fullWidth label='Street Address' value={propertyStreet} onChange={e => setPropertyStreet(e.target.value)} placeholder='123 Main St' />
              <CustomTextField fullWidth label='Street 2' value={propertyStreet2} onChange={e => setPropertyStreet2(e.target.value)} placeholder='Suite, Apt, Unit...' />
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: 2 }}>
                  <CustomTextField fullWidth label='City' value={propertyCity} onChange={e => setPropertyCity(e.target.value)} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  {(() => {
                    const stateList = getStatesForCountry()
                    return (
                      <CustomTextField select fullWidth label={getStateLabel()} value={propertyState} onChange={e => setPropertyState(e.target.value)}>
                        <MenuItem value=''>—</MenuItem>
                        {stateList.map(s => (
                          <MenuItem key={s.id} value={s.id}>{s.abbreviation || s.value || s.label}</MenuItem>
                        ))}
                      </CustomTextField>
                    )
                  })()}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <CustomTextField fullWidth label='Zip' value={propertyZipCode} onChange={e => setPropertyZipCode(e.target.value)} />
                </Box>
              </Box>
              <CustomTextField
                select fullWidth label='Country'
                value={propertyCountry}
                onChange={e => {
                  setPropertyCountry(e.target.value)
                  setPropertyState('') // Clear state when country changes
                }}
              >
                {countries.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.label || c.value}</MenuItem>
                ))}
              </CustomTextField>
            </Box>
          </Box>

          {/* ── Line Items ──────────────────────────────────────── */}
          <LineItemsSection lineItems={lineItems} onChange={setLineItems} />

          {/* ── Discount ────────────────────────────────────────── */}
          <SectionHeader>Discount (Optional)</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', gap: '2px' }}>
              <Box sx={{ flex: '0 0 calc(40% - 1px)', minWidth: 0 }}>
                <CustomTextField select fullWidth label='Discount Type' value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                  <MenuItem value=''>None</MenuItem>
                  <MenuItem value='percent'>Percent (%)</MenuItem>
                  <MenuItem value='amount'>Fixed Amount ($)</MenuItem>
                </CustomTextField>
              </Box>
              {discountType && (
                <Box sx={{ flex: 1 }}>
                  <CustomTextField fullWidth label={discountType === 'percent' ? 'Discount %' : 'Discount Amount'}
                    type='number' inputProps={{ min: 0, step: 0.01 }} value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    InputProps={discountType === 'amount' ? { startAdornment: <InputAdornment position='start'>$</InputAdornment> } : undefined} />
                </Box>
              )}
            </Box>
          </Box>

          {/* ── Totals Breakdown ──────────────────────────────────── */}
          {lineItems.length > 0 && (
            <>
              <SectionHeader>Totals</SectionHeader>
              <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default', minWidth: '360px' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: '2px' }}>
                  {/* Subtotal */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant='body2' color='text.secondary'>Subtotal</Typography>
                    <Typography variant='body1' fontWeight={500}>
                      ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>

                  {/* Discount (only if > 0) */}
                  {discount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant='body2' color='text.secondary'>Discount</Typography>
                      <Typography variant='body1' fontWeight={500} color='success.main'>
                        -${discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  )}

                  {/* Tax */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant='body2' color='text.secondary'>
                      Tax {taxRate > 0 && `(${taxRate}%)`}
                    </Typography>
                    <Typography variant='body1' fontWeight={500}>
                      ${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>

                  {/* Total */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, mt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant='body1' fontWeight={700}>Total</Typography>
                    <Typography variant='h6' fontWeight={700} color='primary'>
                      ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </>
          )}

          {/* ── Payment ─────────────────────────────────────────── */}
          <SectionHeader>Payment</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', gap: '2px' }}>
              <Box sx={{ flex: 1 }}>
                <CustomTextField fullWidth type='date' label='Paid At' value={paidAt}
                  onChange={e => setPaidAt(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <CustomTextField fullWidth type='number' label='Amount Paid' value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)} inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: <InputAdornment position='start'>$</InputAdornment> }} />
              </Box>
            </Box>
          </Box>

          {/* ── Internal Notes ──────────────────────────────────── */}
          <SectionHeader action={
            <IconButton size='small' onClick={() => setNotesModalOpen(true)} sx={{ color: 'warning.main', p: 0.5 }}>
              <i className='tabler-pencil text-base' />
            </IconButton>
          }>Internal Notes (Admin Only)</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'warning.lighter' }}>
            <CustomTextField
              fullWidth multiline minRows={3} label='Internal Notes' value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Private notes — not visible to the customer...'
              helperText='These notes are not shown to the customer.'
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1 }}>
                    <DictationButton size='small' onTranscript={text => setNotes(prev => prev ? `${prev} ${text}` : text)} />
                  </InputAdornment>
                )
              }}
            />
          </Box>

          {/* Audit Footer */}
          
        </Box>
      )}
    </Box>
  )

  return (
    <>
      {inline ? (
        formContent
      ) : (
        <EditPanel
          open={open}
          onClose={onClose}
          onSave={handleSave}
          title={invoiceId ? `Edit Invoice${invoice ? ` — ${invoice.invoiceNumber}` : ''}` : 'New Invoice'}
          isSaving={saveMutation.isPending}
          saveDisabled={submitAttempted && !isFormValid}
          hasUnsavedChanges={title.trim() !== ''}
        >
          {formContent}
        </EditPanel>
      )}

      <NotesEditorModal
        open={notesModalOpen} onClose={() => setNotesModalOpen(false)}
        title='Internal Notes (Admin Only)' value={notes} onChange={setNotes}
        placeholder='Private admin notes — not visible to the customer...'
      />

      {/* Address selection dialog (mobile parity) */}
      <AddressSelectionDialog
        open={addressPickerOpen}
        onClose={() => setAddressPickerOpen(false)}
        addresses={selectedClientForPicker?.addresses || []}
        onSelect={handleAddressSelected}
      />
    </>
  )
}
