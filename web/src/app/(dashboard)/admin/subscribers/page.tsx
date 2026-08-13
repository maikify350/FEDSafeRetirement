import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'

export const metadata: Metadata = { title: 'Subscribers' }

export default function Page() {
  return (
    <div>
      <Typography variant='h4' className='mbe-6'>Subscribers</Typography>
      <Typography color='text.secondary'>Admin: Subscribers</Typography>
    </div>
  )
}
