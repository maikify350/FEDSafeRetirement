import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'

export const metadata: Metadata = { title: 'Tax Codes' }

export default function Page() {
  return (
    <div>
      <Typography variant='h4' className='mbe-6'>Tax Codes</Typography>
      <Typography color='text.secondary'>Admin: Tax Codes</Typography>
    </div>
  )
}
