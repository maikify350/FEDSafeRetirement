export type PrimaryColorConfig = {
  name?: string
  light?: string
  main: string
  dark?: string
  label?: string // human-readable display name
}

// Primary color presets — add new entries here to expand the theme picker.
// Keep "mocha" first so it is the visual default in the picker UI.
const primaryColorConfig: PrimaryColorConfig[] = [
  {
    name: 'primary-mocha',
    label: 'Mocha',
    light: '#C49A6C',
    main: '#A47148',
    dark: '#7A5235'
  },
  {
    name: 'primary-1',
    label: 'Violet',
    light: '#8F85F3',
    main: '#7367F0',
    dark: '#675DD8'
  },
  {
    name: 'primary-2',
    label: 'Teal',
    light: '#4EB0B1',
    main: '#0D9394',
    dark: '#096B6C'
  },
  {
    name: 'primary-3',
    label: 'Amber',
    light: '#FFC25A',
    main: '#FFAB1D',
    dark: '#BA7D15'
  },
  {
    name: 'primary-4',
    label: 'Rose',
    light: '#F0718D',
    main: '#EB3D63',
    dark: '#AC2D48'
  },
  {
    name: 'primary-5',
    label: 'Sky',
    light: '#5CAFF1',
    main: '#2092EC',
    dark: '#176BAC'
  }
]

export default primaryColorConfig
