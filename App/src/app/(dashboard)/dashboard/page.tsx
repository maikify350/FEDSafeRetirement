import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard - FEDSafe Retirement',
  description: 'Federal employee lead management dashboard'
}

export default function DashboardPage() {
  return (
    <div className='flex flex-col gap-6'>
      <h1 className='text-2xl font-semibold'>Dashboard</h1>
      <p className='text-textSecondary'>Welcome to FEDSafe Retirement Lead Manager. Use the sidebar to navigate.</p>

      {/* KPI Cards placeholder */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
        {[
          { title: 'Total Leads', value: '472,576', icon: 'tabler-users', color: 'primary' },
          { title: 'Active Collections', value: '0', icon: 'tabler-folders', color: 'success' },
          { title: 'Leads in Collections', value: '0', icon: 'tabler-user-check', color: 'warning' },
          { title: 'Enriched Leads', value: '0', icon: 'tabler-sparkles', color: 'info' },
        ].map((card) => (
          <div key={card.title} className='flex items-center gap-4 p-6 rounded-lg bg-backgroundPaper shadow-sm border border-divider'>
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-${card.color}/10`}>
              <i className={`${card.icon} text-2xl text-${card.color}`} />
            </div>
            <div>
              <p className='text-sm text-textSecondary'>{card.title}</p>
              <p className='text-2xl font-bold'>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Getting Started placeholder */}
      <div className='p-6 rounded-lg bg-backgroundPaper shadow-sm border border-divider'>
        <h2 className='text-lg font-semibold mb-4'>Getting Started</h2>
        <ol className='list-decimal list-inside space-y-2 text-textSecondary'>
          <li>Import leads from the FOIA data source</li>
          <li>Search and filter leads using the Lead Search page</li>
          <li>Create collections to organize leads into campaigns</li>
          <li>Export collections for outreach</li>
        </ol>
      </div>
    </div>
  )
}
