'use client'

// Third-party Imports
import classnames from 'classnames'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  return (
    <div
      className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}
    >
      <p className='text-textSecondary text-sm'>
        {`© ${new Date().getFullYear()} MustAutomate.AI — All Rights Reserved`}
      </p>
      <p className='text-textSecondary text-sm'>
        Version {process.env.NEXT_PUBLIC_APP_VERSION ?? '—'}
      </p>
    </div>
  )
}

export default FooterContent
