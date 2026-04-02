import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'

export const metadata: Metadata = { title: 'Service Items' }

export default function Page() {
  return (
    <div>
      <Typography variant='h4' className='mbe-6'>Service Items</Typography>
      <Typography color='text.secondary'>Loading Service Items from JobMaster API...</Typography>
    </div>
  )
}
