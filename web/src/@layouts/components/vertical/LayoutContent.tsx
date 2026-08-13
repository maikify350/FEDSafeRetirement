'use client'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ChildrenType } from '@core/types'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

// Styled Component Imports
import StyledMain from '@layouts/styles/shared/StyledMain'

const LayoutContent = ({ children }: ChildrenType) => {
  return (
    <StyledMain
      className={classnames(verticalLayoutClasses.content, 'flex-auto', verticalLayoutClasses.contentWide)}
    >
      {children}
    </StyledMain>
  )
}

export default LayoutContent
