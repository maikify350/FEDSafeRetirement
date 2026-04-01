/*
 * If you change the following items in the config object, you will not see any effect in the local development server
 * as these are stored in the cookie (cookie has the highest priority over the themeConfig):
 * 1. mode
 * 2. skin
 * 3. semiDark
 * 4. layout
 * 5. navbar.contentWidth
 * 6. contentWidth
 * 7. footer.contentWidth
 *
 * To see the effect of the above items, you can click on the reset button from the Customizer
 * which is on the top-right corner of the customizer besides the close button.
 * This will reset the cookie to the values provided in the config object below.
 *
 * Another way is to clear the cookie from the browser's Application/Storage tab and then reload the page.
 */

// Type Imports
import type { Mode, Skin, Layout, LayoutComponentPosition, LayoutComponentWidth } from '@core/types'

type Navbar = {
  type: LayoutComponentPosition
  contentWidth: LayoutComponentWidth
  floating: boolean
  detached: boolean
  blur: boolean
}

type Footer = {
  type: LayoutComponentPosition
  contentWidth: LayoutComponentWidth
  detached: boolean
}

export type Config = {
  templateName: string
  homePageUrl: string
  settingsCookieName: string
  mode: Mode
  skin: Skin
  semiDark: boolean
  layout: Layout
  layoutPadding: number
  navbar: Navbar
  contentWidth: LayoutComponentWidth
  compactContentWidth: number
  footer: Footer
  disableRipple: boolean
}

const themeConfig: Config = {
  templateName: 'FEDSafe Retirement',
  homePageUrl: '/dashboard',
  settingsCookieName: 'fedsafe-retirement-settings',
  mode: 'system', // 'system', 'light', 'dark'
  skin: 'default', // 'default', 'bordered'
  semiDark: true, // Dark sidebar with light content
  layout: 'vertical', // 'vertical', 'collapsed', 'horizontal'
  layoutPadding: 24,
  compactContentWidth: 1440,
  navbar: {
    type: 'fixed',
    contentWidth: 'wide', // Wide for data-dense CRM views
    floating: true,
    detached: true,
    blur: true
  },
  contentWidth: 'wide', // Wide layout for tables
  footer: {
    type: 'static',
    contentWidth: 'wide',
    detached: true
  },
  disableRipple: false
}

export default themeConfig
