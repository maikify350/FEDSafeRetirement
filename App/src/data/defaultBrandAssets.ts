export interface BrandLogoAsset {
  id: string
  name: string
  label: string
  layoutType: 'double' | 'single-shield' | 'single-badge' | 'tagline'
  description: string
  publicUrl: string
  localPath: string
  dimensions: string
  type: 'image'
  mimetype: string
  isTransparent: boolean
  isOfficialBrand: boolean
}

export const OFFICIAL_BRAND_LOGOS: BrandLogoAsset[] = [
  {
    id: 'brand-double-transparent',
    name: 'fedsafe-double-logo-transparent.png',
    label: 'Official Double Logo (Transparent · Tight Crop)',
    layoutType: 'double',
    description: 'Dual lockup (FedSafe Shield + SAM.gov Contractor Badge) with pure transparent alpha background and zero white margins. Ideal for dark mode, video reels, and color backgrounds.',
    publicUrl: '/images/branding/fedsafe-double-logo-transparent.png',
    localPath: 'App/public/images/branding/fedsafe-double-logo-transparent.png',
    dimensions: '1597 × 993',
    type: 'image',
    mimetype: 'image/png',
    isTransparent: true,
    isOfficialBrand: true,
  },
  {
    id: 'brand-shield-transparent',
    name: 'fedsafe-shield-logo-transparent.png',
    label: 'Single Shield Logo (Transparent · Tight Crop)',
    layoutType: 'single-shield',
    description: 'Core FedSafe shield crest only, with pure alpha transparency and tight bounding box. Zero white box behind.',
    publicUrl: '/images/branding/fedsafe-shield-logo-transparent.png',
    localPath: 'App/public/images/branding/fedsafe-shield-logo-transparent.png',
    dimensions: '523 × 588',
    type: 'image',
    mimetype: 'image/png',
    isTransparent: true,
    isOfficialBrand: true,
  },
  {
    id: 'brand-sam-badge-transparent',
    name: 'fedsafe-sam-badge-transparent.png',
    label: 'SAM.gov Contractor Badge (Transparent · Tight Crop)',
    layoutType: 'single-badge',
    description: 'Standalone SAM.gov Registered Federal Contractor badge (UEI: PPQ9UAWNKQ84 / CAGE: 1A8SS5) with pure alpha background.',
    publicUrl: '/images/branding/fedsafe-sam-badge-transparent.png',
    localPath: 'App/public/images/branding/fedsafe-sam-badge-transparent.png',
    dimensions: '615 × 798',
    type: 'image',
    mimetype: 'image/png',
    isTransparent: true,
    isOfficialBrand: true,
  },
  {
    id: 'brand-tagline-transparent',
    name: 'fedsafe-logo-tagline-transparent.png',
    label: 'FedSafe Logo with Tagline (Transparent · Horizontal)',
    layoutType: 'tagline',
    description: 'Horizontal logo lockup with "The Future Favors the Prepared" tagline on transparent background.',
    publicUrl: '/images/branding/fedsafe-logo-tagline-transparent.png',
    localPath: 'App/public/images/branding/fedsafe-logo-tagline-transparent.png',
    dimensions: '448 × 281',
    type: 'image',
    mimetype: 'image/png',
    isTransparent: true,
    isOfficialBrand: true,
  },
]
