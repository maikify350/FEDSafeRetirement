'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
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

/** Max number of concurrent popout windows */
const MAX_POPOUTS = 3

export default function SchedulingView() {
  const queryClient = useQueryClient()
  // Track popout window IDs — supports multiple detached windows
  const [popoutIds, setPopoutIds] = useLocalStorage<string[]>('jm-scheduling-popout-ids', [])
  const [panelSizes, setPanelSizes] = useLocalStorage<number[]>('jm-scheduling-panel-sizes', [25, 75])
  const popoutWindows = useRef<Map<string, Window>>(new Map())

  const isDetached = popoutIds.length > 0

  // ── Realtime: auto-sync when ANY dispatcher changes jobs ──
  useEffect(() => {
    const channel = supabase
      .channel('scheduling-realtime')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'job' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['jobs', 'scheduling'] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  // On mount: verify which popout windows are still alive
  useEffect(() => {
    if (popoutIds.length === 0) return

    const ch = new BroadcastChannel('jm-scheduling-popout')
    const alive = new Set<string>()

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'pong' && e.data?.popoutId) {
        alive.add(e.data.popoutId)
      }
    }
    ch.addEventListener('message', onMessage)

    // Ping all known popouts
    ch.postMessage({ type: 'ping' })

    // After 600ms, remove any that didn't respond
    const timer = setTimeout(() => {
      ch.removeEventListener('message', onMessage)
      ch.close()

      const stillAlive = popoutIds.filter(id => alive.has(id))
      if (stillAlive.length !== popoutIds.length) {
        setPopoutIds(stillAlive)
      }
    }, 600)

    return () => {
      clearTimeout(timer)
      ch.removeEventListener('message', onMessage)
      ch.close()
    }
  // Run only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for popout window opening/closing via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('jm-scheduling-popout')
    channel.onmessage = (e) => {
      if (e.data?.type === 'popout-closed' && e.data?.popoutId) {
        setPopoutIds(prev => prev.filter(id => id !== e.data.popoutId))
        popoutWindows.current.delete(e.data.popoutId)
      }
    }
    return () => channel.close()
  }, [setPopoutIds])

  // If this page unloads while popouts are open, close them all
  useEffect(() => {
    const handleUnload = () => {
      popoutWindows.current.forEach(w => w.close())
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  const handleDetach = useCallback(() => {
    if (popoutIds.length >= MAX_POPOUTS) return

    // Generate a unique ID for this popout
    const popoutId = `popout-${Date.now()}`

    const w = window.open(
      `/scheduling-popout?id=${popoutId}`,
      `jm-scheduling-${popoutId}`,
      'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no'
    )
    if (w) {
      popoutWindows.current.set(popoutId, w)
      setPopoutIds(prev => [...prev, popoutId])
    }
  }, [popoutIds.length, setPopoutIds])

  const handleCloseAll = useCallback(() => {
    // Close all popout windows
    popoutWindows.current.forEach(w => w.close())
    popoutWindows.current.clear()

    // Also broadcast force-close in case we lost window refs
    const ch = new BroadcastChannel('jm-scheduling-popout')
    ch.postMessage({ type: 'force-close-all' })
    ch.close()

    setPopoutIds([])
  }, [setPopoutIds])

  const SchedulerContent = (
    <PanelGroup
      direction='horizontal'
      onLayout={setPanelSizes}
      style={{ height: 'calc(100vh - 120px)', minHeight: '600px' }}
    >
      {/* Left Panel - Unscheduled Jobs */}
      <Panel
        defaultSize={panelSizes[0]}
        minSize={20}
        maxSize={40}
        className='flex flex-col p-4 pr-2'
      >
        <UnscheduledJobsList />
      </Panel>

      {/* Resize Handle */}
      <PanelResizeHandle className='w-2 bg-gray-100 border-x border-gray-200 cursor-col-resize flex items-center justify-center transition-colors hover:bg-primary-main hover:border-primary-main active:bg-primary-main'>
        <i className='tabler-grip-vertical text-gray-400 hover:text-white' />
      </PanelResizeHandle>

      {/* Right Panel - Calendar */}
      <Panel defaultSize={panelSizes[1]} minSize={50} className='flex flex-col p-4 pl-2'>
        <Box className='flex items-center justify-end mb-2 gap-2'>
          <Tooltip title='Open in separate window (for second monitor)'>
            <IconButton
              onClick={handleDetach}
              size='small'
              className='hover:bg-gray-200 border border-gray-200'
            >
              <i className='tabler-external-link' />
            </IconButton>
          </Tooltip>
        </Box>
        <CalendarBoard />
      </Panel>
    </PanelGroup>
  )

  return (
    <div className='flex flex-col gap-4'>
      {isDetached ? (
        <Card>
          <CardContent className='p-8'>
            <Box className='flex flex-col items-center justify-center gap-4'>
              <i className='tabler-external-link text-6xl text-primary-main' />
              <Typography variant='h6' color='text.primary'>
                Scheduling Board Detached
              </Typography>

              <Chip
                icon={<i className='tabler-window text-sm' />}
                label={`${popoutIds.length} window${popoutIds.length === 1 ? '' : 's'} open`}
                color='primary'
                variant='outlined'
              />

              <Typography variant='body2' color='text.secondary' className='text-center'>
                Your scheduling board{popoutIds.length > 1 ? 's are' : ' is'} open in {popoutIds.length > 1 ? 'separate windows' : 'a separate window'}.
                <br />
                Each window has independent filters and date navigation.
              </Typography>

              <Typography variant='caption' color='text.secondary' className='text-center' sx={{ mt: -1 }}>
                Use the sidebar menu to navigate — scheduling windows stay open.
              </Typography>

              <Box className='flex items-center gap-2'>
                {popoutIds.length < MAX_POPOUTS && (
                  <Button
                    variant='outlined'
                    color='info'
                    startIcon={<i className='tabler-plus' />}
                    onClick={handleDetach}
                  >
                    Open Another Window
                  </Button>
                )}
                <Button
                  variant='outlined'
                  color='primary'
                  startIcon={<i className='tabler-arrow-back-up' />}
                  onClick={handleCloseAll}
                >
                  Bring Back Here
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className='p-0'>
            {SchedulerContent}
          </CardContent>
        </Card>
      )}

      <style>{`
        .fc-scroller::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .fc-scroller::-webkit-scrollbar-track {
          background: var(--mui-palette-action-hover); 
        }
        .fc-scroller::-webkit-scrollbar-thumb {
          background: var(--mui-palette-action-disabled); 
          border-radius: 4px;
        }
        .fc-scroller::-webkit-scrollbar-thumb:hover {
          background: var(--mui-palette-action-active); 
        }
      `}</style>
    </div>
  )
}
