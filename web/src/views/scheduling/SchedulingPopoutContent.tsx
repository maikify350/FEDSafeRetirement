'use client'

import { useState, useEffect, useMemo } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import useLocalStorage from '@/hooks/useLocalStorage'

// Dynamic imports with SSR disabled — FullCalendar & Draggable need `window`/`document`
const UnscheduledJobsList = dynamic(() => import('./UnscheduledJobsList'), {
  ssr: false,
  loading: () => (
    <Box className='flex items-center justify-center h-full'>
      <CircularProgress size={28} />
    </Box>
  ),
})

const CalendarBoard = dynamic(() => import('./CalendarBoard'), {
  ssr: false,
  loading: () => (
    <Box className='flex items-center justify-center h-full'>
      <CircularProgress size={28} />
    </Box>
  ),
})

/**
 * Standalone scheduling content rendered in a popout window.
 * Each popout has a unique ID via ?id= query param so multiple
 * windows can coexist with independent filters & date navigation.
 */
export default function SchedulingPopoutContent() {
  // Read popout ID from URL on the client only (avoids SSR hydration issues)
  const [popoutId, setPopoutId] = useState('popout-default')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setPopoutId(params.get('id') || 'popout-default')
  }, [])

  const queryClient = useQueryClient()
  const [panelSizes, setPanelSizes] = useLocalStorage<number[]>('jm-scheduling-panel-sizes', [25, 75])

  // Derive a window label from the popout ID
  const windowLabel = useMemo(() => {
    const num = popoutId.replace('popout-', '').slice(-4)
    return num
  }, [popoutId])

  // ── Realtime: auto-sync when ANY dispatcher changes jobs ──
  useEffect(() => {
    const channel = supabase
      .channel(`scheduling-realtime-${popoutId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'job' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['jobs', 'scheduling'] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient, popoutId])

  useEffect(() => {
    // Tell the parent window we're alive
    const channel = new BroadcastChannel('jm-scheduling-popout')
    channel.postMessage({ type: 'popout-opened', popoutId })

    // Set the window title
    document.title = `Scheduling Board #${windowLabel} | JobMaster`

    // Respond to pings from the main window (so it can verify we're alive)
    // and handle force-close requests
    channel.onmessage = (e) => {
      if (e.data?.type === 'ping') {
        channel.postMessage({ type: 'pong', popoutId })
      }
      if (e.data?.type === 'force-close-all') {
        window.close()
      }
    }

    // When this window closes, notify the parent
    const handleUnload = () => {
      channel.postMessage({ type: 'popout-closed', popoutId })
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => {
      handleUnload()
      channel.close()
      window.removeEventListener('beforeunload', handleUnload)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoutId])

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 3,
          py: 1.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          flexShrink: 0,
        }}
      >
        <i className='tabler-calendar-event text-2xl' />
        <Typography variant='h6' fontWeight={600}>
          Scheduling Board
        </Typography>
        <Chip
          label={`#${windowLabel}`}
          size='small'
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
        <Box sx={{ flex: 1 }} />
        <Typography variant='caption' sx={{ opacity: 0.7 }}>
          Independent filters & navigation
        </Typography>
      </Box>

      {/* Content */}
      <PanelGroup
        direction='horizontal'
        onLayout={setPanelSizes}
        style={{ flex: 1, minHeight: 0 }}
      >
        {/* Left Panel - Unscheduled Jobs */}
        <Panel defaultSize={panelSizes[0]} minSize={20} maxSize={40} className='flex flex-col p-4 pr-2'>
          <UnscheduledJobsList />
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className='w-2 bg-gray-100 border-x border-gray-200 cursor-col-resize flex items-center justify-center transition-colors hover:bg-primary-main hover:border-primary-main active:bg-primary-main'>
          <i className='tabler-grip-vertical text-gray-400 hover:text-white' />
        </PanelResizeHandle>

        {/* Right Panel - Calendar */}
        <Panel defaultSize={panelSizes[1]} minSize={50} className='flex flex-col p-4 pl-2'>
          <CalendarBoard />
        </Panel>
      </PanelGroup>
    </Box>
  )
}
