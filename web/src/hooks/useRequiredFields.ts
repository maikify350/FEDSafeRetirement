/**
 * Dynamic Required Fields Validation for Web
 *
 * Mirrors mobile's required-fields-store.ts and useRequiredFields.ts.
 * Uses localStorage so admin toggles persist across sessions.
 *
 * The defaults here MUST match mobile/src/lib/state/required-fields-store.ts
 * to ensure consistent validation across platforms.
 */

import { useCallback, useSyncExternalStore } from 'react'

// ── Interfaces (match mobile exactly) ──────────────────────────────────────

export interface ClientRequiredFields {
  firstName: boolean
  lastName: boolean
  company: boolean
  phone: boolean
  email: boolean
  address: boolean
  customerType: boolean
}

export interface UserRequiredFields {
  name: boolean
  email: boolean
  phone: boolean
  role: boolean
}

export interface JobRequiredFields {
  clientId: boolean
  title: boolean
  jobType: boolean
  description: boolean
  priority: boolean
  propertyName: boolean
  address: boolean
  assignedTo: boolean
  scheduledDate: boolean
  neededBy: boolean
  inspectionDate: boolean
  inspectedById: boolean
  lineItems: boolean
  taxRate: boolean
  notes: boolean
}

export interface QuoteRequiredFields {
  clientId: boolean
  title: boolean
  jobType: boolean
  description: boolean
  propertyName: boolean
  address: boolean
  assignedTo: boolean
  lineItems: boolean
  taxRate: boolean
  validUntil: boolean
  notes: boolean
}

export interface InvoiceRequiredFields {
  clientId: boolean
  lineItems: boolean
  dueDate: boolean
}

export interface VendorRequiredFields {
  company: boolean
  name: boolean
  phone: boolean
  email: boolean
  address: boolean
  vendorCategory: boolean
}

export interface RequestRequiredFields {
  clientId: boolean
  title: boolean
  tradeType: boolean
  lineItems: boolean
  address: boolean
}

export interface PurchaseOrderRequiredFields {
  vendorId: boolean
  title: boolean
  lineItems: boolean
  dueDate: boolean
  description: boolean
  notes: boolean
}

export interface VehicleRequiredFields {
  name: boolean
  vehicleTypeId: boolean
  vin: boolean
  year: boolean
  makeId: boolean
  modelId: boolean
  licensePlate: boolean
  color: boolean
  statusId: boolean
  usageReading: boolean
  fuelType: boolean
}

export interface RequiredFieldsConfig {
  client: ClientRequiredFields
  user: UserRequiredFields
  job: JobRequiredFields
  quote: QuoteRequiredFields
  invoice: InvoiceRequiredFields
  vendor: VendorRequiredFields
  request: RequestRequiredFields
  purchaseOrder: PurchaseOrderRequiredFields
  vehicle: VehicleRequiredFields
}

export type TableType = keyof RequiredFieldsConfig

// ── Defaults (MUST match mobile) ───────────────────────────────────────────

const defaultRequiredFields: RequiredFieldsConfig = {
  client: {
    firstName: true,
    lastName: false,
    company: false,
    phone: true,
    email: false,
    address: false,
    customerType: false,
  },
  user: {
    name: true,
    email: true,
    phone: false,
    role: true,
  },
  job: {
    clientId: true,
    title: true,
    jobType: true,
    description: false,
    priority: false,
    propertyName: false,
    address: false,
    assignedTo: false,
    scheduledDate: false,
    neededBy: false,
    inspectionDate: false,
    inspectedById: false,
    lineItems: false,
    taxRate: false,
    notes: false,
  },
  quote: {
    clientId: true,
    title: false,
    jobType: false,
    description: false,
    propertyName: false,
    address: false,
    assignedTo: false,
    lineItems: true,
    taxRate: false,
    validUntil: false,
    notes: false,
  },
  invoice: {
    clientId: true,
    lineItems: true,
    dueDate: false,
  },
  vendor: {
    company: true,
    name: false,
    phone: true,
    email: true,
    address: false,
    vendorCategory: false,
  },
  request: {
    clientId: true,
    title: true,
    tradeType: false,
    lineItems: true,
    address: false,
  },
  purchaseOrder: {
    vendorId: true,
    title: false,
    lineItems: true,
    dueDate: false,
    description: false,
    notes: false,
  },
  vehicle: {
    name: true,
    vehicleTypeId: true,
    vin: false,
    year: false,
    makeId: false,
    modelId: false,
    licensePlate: false,
    color: false,
    statusId: false,
    usageReading: false,
    fuelType: false,
  },
}

// ── Field labels (for error messages) ──────────────────────────────────────

export const fieldLabels: Record<TableType, Record<string, string>> = {
  client: {
    firstName: 'First Name',
    lastName: 'Last Name',
    company: 'Company',
    phone: 'Phone (at least one)',
    email: 'Email (at least one)',
    address: 'Address',
    customerType: 'Customer Type',
  },
  user: {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    role: 'Role',
  },
  job: {
    clientId: 'Client',
    title: 'Job Title',
    jobType: 'Job Type',
    description: 'Description',
    priority: 'Priority',
    propertyName: 'Property Name',
    address: 'Property Address',
    assignedTo: 'Assigned To',
    scheduledDate: 'Scheduled Date',
    neededBy: 'Needed By (Deadline)',
    inspectionDate: 'Inspection Date',
    inspectedById: 'Inspected By',
    lineItems: 'Line Items (at least one)',
    taxRate: 'Tax Rate',
    notes: 'Notes',
  },
  quote: {
    clientId: 'Client',
    title: 'Quote Title',
    jobType: 'Job Type',
    description: 'Description',
    propertyName: 'Property Name',
    address: 'Property Address',
    assignedTo: 'Estimator',
    lineItems: 'Line Items (at least one)',
    taxRate: 'Tax Rate',
    validUntil: 'Valid Until Date',
    notes: 'Notes',
  },
  invoice: {
    clientId: 'Client',
    lineItems: 'Line Items (at least one)',
    dueDate: 'Due Date',
  },
  vendor: {
    company: 'Company Name',
    name: 'Contact Name',
    phone: 'Phone (at least one)',
    email: 'Email',
    address: 'Address',
    vendorCategory: 'Vendor Category',
  },
  request: {
    clientId: 'Client',
    title: 'Title',
    tradeType: 'Trade Type',
    lineItems: 'Line Items (at least one)',
    address: 'Address',
  },
  purchaseOrder: {
    vendorId: 'Vendor',
    title: 'PO Title',
    lineItems: 'Line Items (at least one)',
    dueDate: 'Due Date',
    description: 'Description',
    notes: 'Notes',
  },
  vehicle: {
    name: 'Vehicle Name',
    vehicleTypeId: 'Vehicle Type',
    vin: 'VIN / Serial Number',
    year: 'Year',
    makeId: 'Make',
    modelId: 'Model',
    licensePlate: 'License Plate',
    color: 'Color',
    statusId: 'Status',
    usageReading: 'Odometer / Usage',
    fuelType: 'Fuel Type',
  },
}

// ── localStorage-backed store ──────────────────────────────────────────────

const STORAGE_KEY = 'jm-required-fields'
let listeners: Array<() => void> = []

function getConfig(): RequiredFieldsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RequiredFieldsConfig>
      // Merge with defaults to ensure new fields/tables are always present
      const merged = { ...defaultRequiredFields }
      for (const key of Object.keys(defaultRequiredFields) as TableType[]) {
        if (parsed[key]) {
          merged[key] = { ...merged[key], ...parsed[key] } as any
        }
      }
      return merged
    }
  } catch { /* ignore */ }
  return defaultRequiredFields
}

function setConfig(config: RequiredFieldsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => { listeners = listeners.filter((l) => l !== listener) }
}

/** React hook to get the full config (reactive) */
export function useRequiredFieldsConfig(): RequiredFieldsConfig {
  return useSyncExternalStore(subscribe, getConfig, () => defaultRequiredFields)
}

// ── Validation types ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  errors: string[]
  fieldErrors: Record<string, string>
}

// ── Main hook ──────────────────────────────────────────────────────────────

/**
 * Hook for validating form data against configured required fields.
 *
 * Usage:
 *   const { validate, isRequired } = useRequiredFieldsValidation('client')
 *   const result = validate({ firstName, lastName, phones, emails })
 *   if (!result.valid) { ... show result.fieldErrors ... }
 *   <TextField required={isRequired('firstName')} ... />
 */
export function useRequiredFieldsValidation(table: TableType) {
  const fullConfig = useRequiredFieldsConfig()
  const config = fullConfig[table]

  const validate = useCallback(
    (data: Record<string, unknown>): ValidationResult => {
      const errors: string[] = []
      const fieldErrors: Record<string, string> = {}
      const labels = fieldLabels[table] ?? {}
      const configRecord = (config ?? {}) as unknown as Record<string, boolean>

      Object.keys(configRecord).forEach((field) => {
        const isReq = configRecord[field]
        if (!isReq) return

        const label = labels[field] || field
        const value = data[field]

        // Special handling for array fields
        if (field === 'phone') {
          const phoneString = data.phone as string | undefined
          const phones = data.phones as Array<{ number?: string }> | undefined
          const hasValid =
            (typeof phoneString === 'string' && phoneString.trim()) ||
            (phones && phones.length > 0 && phones.some((p) => p.number?.trim()))
          if (!hasValid) {
            errors.push(`${label} is required`)
            fieldErrors[field] = `${label} is required`
          }
        } else if (field === 'email') {
          const emailString = data.email as string | undefined
          const emails = data.emails as Array<{ address?: string; email?: string }> | undefined
          const hasValid =
            (typeof emailString === 'string' && emailString.trim()) ||
            (emails && emails.length > 0 && emails.some((e) => (e.address || e.email || '').trim()))
          if (!hasValid) {
            errors.push(`${label} is required`)
            fieldErrors[field] = `${label} is required`
          }
        } else if (field === 'lineItems') {
          const items = data.lineItems as unknown[] | undefined
          if (!items || items.length === 0) {
            errors.push(`${label} is required`)
            fieldErrors[field] = `${label} is required`
          }
        } else if (field === 'address') {
          const street = (data.street || data.addressStreet) as string | undefined
          if (!street || !street.trim()) {
            errors.push(`${label} is required`)
            fieldErrors[field] = `${label} is required`
          }
        } else {
          // Standard field check
          if (value === undefined || value === null || value === '') {
            errors.push(`${label} is required`)
            fieldErrors[field] = `${label} is required`
          } else if (typeof value === 'string' && !value.trim()) {
            errors.push(`${label} is required`)
            fieldErrors[field] = `${label} is required`
          }
        }
      })

      return { valid: errors.length === 0, errors, fieldErrors }
    },
    [config, table],
  )

  const isRequired = useCallback(
    (field: string): boolean => {
      const configRecord = (config ?? {}) as unknown as Record<string, boolean>
      return configRecord[field] ?? false
    },
    [config],
  )

  return { validate, isRequired }
}

// ── Admin helpers ──────────────────────────────────────────────────────────

export function toggleRequiredField(table: TableType, field: string) {
  const config = getConfig()
  const tableConfig = { ...config[table] } as Record<string, boolean>
  tableConfig[field] = !tableConfig[field]
  setConfig({ ...config, [table]: tableConfig } as RequiredFieldsConfig)
}

export function setFieldRequired(table: TableType, field: string, required: boolean) {
  const config = getConfig()
  const tableConfig = { ...config[table] } as Record<string, boolean>
  tableConfig[field] = required
  setConfig({ ...config, [table]: tableConfig } as RequiredFieldsConfig)
}

export function resetToDefaults() {
  setConfig(defaultRequiredFields)
}

export { defaultRequiredFields }
