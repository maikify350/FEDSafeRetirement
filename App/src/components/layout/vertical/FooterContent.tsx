'use client'

// Next Imports
import Link from 'next/link'

// Third-party Imports
import classnames from 'classnames'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  return (
    <div
      className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-center flex-wrap gap-4')}
    >
      <p className='text-textSecondary text-sm'>
        {`© ${new Date().getFullYear()} — Powered by `}
        <Link href='https://www.mustautomate.ai' target='_blank' className='text-primary font-medium hover:underline'>
          www.MustAutomate.Ai
        </Link>
        {' Technologies'}
      </p>
    </div>
  )
}

export default FooterContent
