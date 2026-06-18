// Template placeholder registry
// Groups of [[token]] values available for each applies_to section

import type { TemplateAppliesTo } from '@shared/contracts'

// Runtime constant — mirrors templateAppliesToValues in shared/contracts.ts
// Kept here so the Dialog can import it without pulling in zod at bundle time
export const TEMPLATE_APPLIES_TO_VALUES: TemplateAppliesTo[] = [
  'contacts',
  'jobs',
  'quotes',
  'invoices',
  'purchase_orders',
  'requests',
  'general',
]

export type PlaceholderToken = {
  token: string
  description: string
}

export type PlaceholderGroup = {
  label: string
  tokens: PlaceholderToken[]
}

// Shared tokens available in every template type
const COMPANY_TOKENS: PlaceholderGroup = {
  label: 'Company',
  tokens: [
    { token: '[[company_name]]',    description: 'Your business name' },
    { token: '[[company_phone]]',   description: 'Your business phone' },
    { token: '[[company_email]]',   description: 'Your business email' },
    { token: '[[company_address]]', description: 'Your business address' },
    { token: '[[today_date]]',      description: "Today's date" },
  ],
}

const CLIENT_TOKENS: PlaceholderGroup = {
  label: 'Client',
  tokens: [
    { token: '[[customer_name]]',    description: 'Full client name' },
    { token: '[[customer_first]]',   description: 'Client first name' },
    { token: '[[customer_last]]',    description: 'Client last name' },
    { token: '[[customer_email]]',   description: 'Client email address' },
    { token: '[[customer_phone]]',   description: 'Client phone number' },
    { token: '[[customer_address]]', description: 'Client full address' },
    { token: '[[customer_company]]', description: 'Client company name' },
  ],
}

export const TEMPLATE_PLACEHOLDERS: Record<string, PlaceholderGroup[]> = {
  contacts: [
    CLIENT_TOKENS,
    COMPANY_TOKENS,
  ],

  jobs: [
    {
      label: 'Job',
      tokens: [
        { token: '[[job_number]]',    description: 'Job number (e.g. JOB-2026-0042)' },
        { token: '[[job_title]]',     description: 'Job title' },
        { token: '[[job_status]]',    description: 'Current job status' },
        { token: '[[job_date]]',      description: 'Scheduled date' },
        { token: '[[job_address]]',   description: 'Job site address' },
        { token: '[[assigned_tech]]', description: 'Assigned technician name' },
        { token: '[[job_notes]]',     description: 'Job notes' },
      ],
    },
    CLIENT_TOKENS,
    COMPANY_TOKENS,
  ],

  quotes: [
    {
      label: 'Quote',
      tokens: [
        { token: '[[quote_number]]',  description: 'Quote number' },
        { token: '[[quote_title]]',   description: 'Quote title' },
        { token: '[[quote_total]]',   description: 'Quote total amount' },
        { token: '[[quote_status]]',  description: 'Quote status' },
        { token: '[[issue_date]]',    description: 'Quote issue date' },
        { token: '[[expiry_date]]',   description: 'Quote expiry date' },
        { token: '[[quote_notes]]',   description: 'Quote notes' },
      ],
    },
    CLIENT_TOKENS,
    COMPANY_TOKENS,
  ],

  invoices: [
    {
      label: 'Invoice',
      tokens: [
        { token: '[[invoice_number]]', description: 'Invoice number' },
        { token: '[[invoice_total]]',  description: 'Total amount due' },
        { token: '[[invoice_status]]', description: 'Invoice status' },
        { token: '[[due_date]]',       description: 'Payment due date' },
        { token: '[[payment_terms]]',  description: 'Payment terms' },
        { token: '[[invoice_notes]]',  description: 'Invoice notes' },
      ],
    },
    CLIENT_TOKENS,
    COMPANY_TOKENS,
  ],

  purchase_orders: [
    {
      label: 'Purchase Order',
      tokens: [
        { token: '[[po_number]]',   description: 'PO number' },
        { token: '[[po_total]]',    description: 'PO total amount' },
        { token: '[[po_status]]',   description: 'PO status' },
        { token: '[[vendor_name]]', description: 'Vendor name' },
        { token: '[[po_date]]',     description: 'PO date' },
        { token: '[[po_notes]]',    description: 'PO notes' },
      ],
    },
    COMPANY_TOKENS,
  ],

  requests: [
    {
      label: 'Request',
      tokens: [
        { token: '[[request_number]]',  description: 'Request number' },
        { token: '[[request_title]]',   description: 'Request title' },
        { token: '[[request_status]]',  description: 'Request status' },
        { token: '[[request_date]]',    description: 'Request date' },
        { token: '[[request_notes]]',   description: 'Request notes' },
      ],
    },
    CLIENT_TOKENS,
    COMPANY_TOKENS,
  ],

  general: [
    CLIENT_TOKENS,
    COMPANY_TOKENS,
  ],
}
