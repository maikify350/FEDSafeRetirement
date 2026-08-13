import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'

export const metadata: Metadata = { title: 'Lookups' }

export default function Page() {
  return (
    <div>
      <Typography variant='h4' className='mbe-6'>Lookups</Typography>
      <Typography color='text.secondary'>Admin: Lookups</Typography>
    </div>
  )
}
