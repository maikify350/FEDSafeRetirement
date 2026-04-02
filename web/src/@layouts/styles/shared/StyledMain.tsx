// Third-party Imports
import styled from '@emotion/styled'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Util Imports
import { commonLayoutClasses } from '@layouts/utils/layoutClasses'


const StyledMain = styled.main`
  padding: ${themeConfig.layoutPadding}px ${themeConfig.layoutPadding}px 2px ${themeConfig.layoutPadding}px;

  &:has(.${commonLayoutClasses.contentHeightFixed}) {
    display: flex;
    overflow: hidden;
  }
`

export default StyledMain
