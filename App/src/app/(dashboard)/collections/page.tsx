import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Collections - FEDSafe Retirement',
  description: 'Manage lead collections and campaigns'
}

export default function CollectionsPage() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-semibold'>Collections</h1>
          <p className='text-textSecondary'>
            Organize leads into targeted campaign lists for outreach.
          </p>
        </div>
      </div>

      {/* Placeholder — will be replaced with collection cards/grid in Phase 2 */}
      <div className='p-12 rounded-lg bg-backgroundPaper shadow-sm border border-divider text-center'>
        <i className='tabler-folders text-6xl text-textDisabled mb-4' />
        <h3 className='text-lg font-medium mb-2'>No Collections Yet</h3>
        <p className='text-textSecondary mb-4'>
          Create your first collection to start organizing leads into campaign groups.
        </p>
        <p className='text-sm text-textDisabled'>
          Components: Vuexy Card Grid + Collection CRUD
        </p>
      </div>
    </div>
  )
}
