import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'

export const metadata: Metadata = { title: 'Site Equipment' }

export default function Page() {
  return (
    <div>
      <Typography variant='h4' className='mbe-6'>Site Equipment</Typography>
      <Typography color='text.secondary'>Loading Site Equipment from JobMaster API...</Typography>
    </div>
  )
}
