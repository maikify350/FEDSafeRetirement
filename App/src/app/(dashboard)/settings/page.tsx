import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings - FEDSafe Retirement',
  description: 'Manage your account settings and preferences'
}

export default function SettingsPage() {
  return (
    <div className='flex flex-col gap-6'>
      <h1 className='text-2xl font-semibold'>Settings</h1>
      <p className='text-textSecondary'>
        Manage your profile and application preferences.
      </p>

      {/* Placeholder — will be replaced with Settings tabs in Phase 4 */}
      <div className='p-12 rounded-lg bg-backgroundPaper shadow-sm border border-divider text-center'>
        <i className='tabler-settings text-6xl text-textDisabled mb-4' />
        <h3 className='text-lg font-medium mb-2'>Settings</h3>
        <p className='text-textSecondary'>
          Profile management, theme preferences, and notification settings will be available here.
        </p>
        <p className='text-sm text-textDisabled mt-2'>
          All preferences stored in users.settings JSONB column.
        </p>
      </div>
    </div>
  )
}
