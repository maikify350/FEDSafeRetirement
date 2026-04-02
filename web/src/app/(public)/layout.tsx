/**
 * Public Layout — No sidebar, no auth, minimal chrome.
 * Used for public-facing pages like the booking form.
 */
import type { ChildrenType } from '@core/types'

const PublicLayout = ({ children }: ChildrenType) => {
  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center p-4 sm:p-8'>
      {children}
    </div>
  )
}

export default PublicLayout
