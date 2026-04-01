import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lead Search - FEDSafe Retirement',
  description: 'Search and filter federal employee leads'
}

export default function LeadsPage() {
  return (
    <div className='flex flex-col gap-6'>
      <h1 className='text-2xl font-semibold'>Lead Search</h1>
      <p className='text-textSecondary'>
        Search through 472,576 US Postal Service federal employee records.
        Use filters to narrow results and select leads for your campaigns.
      </p>

      {/* Placeholder — will be replaced with the full TanStack Table grid in Phase 1 */}
      <div className='p-12 rounded-lg bg-backgroundPaper shadow-sm border border-divider text-center'>
        <i className='tabler-database-search text-6xl text-textDisabled mb-4' />
        <h3 className='text-lg font-medium mb-2'>Lead Search Grid</h3>
        <p className='text-textSecondary'>
          The searchable data grid with filters, sorting, and pagination will be implemented here.
        </p>
        <p className='text-sm text-textDisabled mt-2'>
          Components: TanStack React Table + Vuexy UserListTable pattern
        </p>
      </div>
    </div>
  )
}
