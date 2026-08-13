'use client'

import { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { DndContext, DragOverlay, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Job, User } from '@shared/contracts'
import { api } from '@/lib/api'

import JobsList from './JobsList'
import TechsList from './TechsList'
import DispatchMap from './DispatchMap'
import useLocalStorage from '@/hooks/useLocalStorage'

/**
 * Dispatch board with map view, technician locations, and job assignment.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/dispatch/DispatchView.tsx
 */
export default function DispatchView() {
  const queryClient = useQueryClient()
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null)
  const [isDetached, setIsDetached] = useState(false)
  const [panelSizes, setPanelSizes] = useLocalStorage<number[]>('jm-dispatch-panel-sizes', [30, 70])
  const [hiddenTechIds, setHiddenTechIds] = useState<Set<string>>(new Set())
  const [hideMapClutter, setHideMapClutter] = useLocalStorage<boolean>('jm-dispatch-hide-map-clutter', true)
  const [simulationEnabled, setSimulationEnabled] = useLocalStorage<boolean>('jm-dispatch-simulation', true)

  // Drag-and-drop state
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null)
  const [pendingDispatch, setPendingDispatch] = useState<{ jobId: string; techId: string } | null>(null)

  // Fetch all jobs for drag overlay (filtering is done in JobsList)
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ['jobs', 'dispatch', 'all'],
    queryFn: () => api.get<Job[]>('/api/jobs')
  })

  // Fetch active techs (uses dedicated /active endpoint that filters on backend)
  const { data: techs = [] } = useQuery<User[]>({
    queryKey: ['team-members', 'active'],
    queryFn: () => api.get<User[]>('/api/users/active')
  })

  // Dispatch mutation
  const dispatchMutation = useMutation({
    mutationFn: async ({ jobId, techId }: { jobId: string; techId: string }) => {
      return api.patch(`/api/jobs/${jobId}`, {
        assignedTo: techId,
        status: 'assigned'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      setSelectedJobId(null)
      setSelectedTechId(null)
    }
  })

  const handleDetach = () => {
    setIsDetached(true)
  }

  const handleCloseDetached = () => {
    setIsDetached(false)
  }

  const handleToggleTechVisibility = (techId: string) => {
    setHiddenTechIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(techId)) {
        newSet.delete(techId)
      } else {
        newSet.add(techId)
      }
      return newSet
    })
  }

  const handleToggleAllTechs = (techIds: string[]) => {
    if (hiddenTechIds.size === techIds.length) {
      // All hidden, show all
      setHiddenTechIds(new Set())
    } else {
      // Some or none hidden, hide all
      setHiddenTechIds(new Set(techIds))
    }
  }

  // Drag-and-drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const jobId = event.active.id as string
    setDraggedJobId(jobId)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedJobId(null)

    if (!over) return

    const jobId = active.id as string
    const techId = over.id as string

    // Show confirmation dialog
    setPendingDispatch({ jobId, techId })
  }

  const handleConfirmDispatch = () => {
    if (pendingDispatch) {
      dispatchMutation.mutate(pendingDispatch)
      setPendingDispatch(null)
    }
  }

  const handleCancelDispatch = () => {
    setPendingDispatch(null)
  }

  const handleManualDispatch = () => {
    if (selectedJobId && selectedTechId) {
      dispatchMutation.mutate({ jobId: selectedJobId, techId: selectedTechId })
    }
  }

  const draggedJob = jobs.find(j => j.id === draggedJobId)
  const pendingJob = jobs.find(j => j.id === pendingDispatch?.jobId)
  const pendingTech = techs.find(t => t.id === pendingDispatch?.techId)

  const MapComponent = (
    <DispatchMap
      selectedJobId={selectedJobId}
      selectedTechId={selectedTechId}
      isDetached={isDetached}
      hiddenTechIds={hiddenTechIds}
      hideMapClutter={hideMapClutter}
      simulationEnabled={simulationEnabled}
    />
  )

  // Entire dispatch content (for both main view and detached window)
  const DispatchContent = (
    <PanelGroup
      direction='horizontal'
      onLayout={setPanelSizes}
      style={{ height: isDetached ? 'calc(100vh - 60px)' : 'calc(100vh - 120px)', minHeight: '600px' }}
    >
      {/* Left Panel - Jobs & Techs */}
      <Panel
        defaultSize={panelSizes[0]}
        minSize={25}
        maxSize={70}
        className='flex flex-col'
      >
        <Box className='flex flex-col h-full p-4 gap-4'>
          {/* Jobs List - Top Half */}
          <Box className='flex-1 min-h-0'>
            <JobsList
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
              selectedTechId={selectedTechId}
              onDispatch={handleManualDispatch}
              isDispatching={dispatchMutation.isPending}
            />
          </Box>

          {/* Techs List - Bottom Half */}
          <Box className='flex-1 min-h-0'>
            <TechsList
              selectedTechId={selectedTechId}
              onSelectTech={setSelectedTechId}
              selectedJobId={selectedJobId}
              hiddenTechIds={hiddenTechIds}
              onToggleTechVisibility={handleToggleTechVisibility}
              onToggleAllTechs={handleToggleAllTechs}
            />
          </Box>
        </Box>
      </Panel>

      {/* Resize Handle */}
      <PanelResizeHandle className='w-2 bg-gray-100 border-x border-gray-200 cursor-col-resize flex items-center justify-center transition-colors hover:bg-primary-main hover:border-primary-main active:bg-primary-main'>
        <i className='tabler-grip-vertical text-gray-400 hover:text-white' />
      </PanelResizeHandle>

      {/* Right Panel - Map */}
      <Panel defaultSize={panelSizes[1]} minSize={30}>
        <Box className='h-full p-4 flex flex-col gap-2'>
          {/* Map Controls Toolbar */}
          <Box className='flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200'>
            <Box className='flex items-center gap-2'>
              {/* Simulation Toggle */}
              <Chip
                label='SIM'
                size='small'
                onClick={() => setSimulationEnabled(!simulationEnabled)}
                color={simulationEnabled ? 'success' : 'default'}
                variant={simulationEnabled ? 'filled' : 'outlined'}
                className='cursor-pointer'
                sx={{
                  '& .MuiChip-label': { px: 1.5, fontWeight: 600 }
                }}
              />
              {/* Hide Clutter Toggle */}
              <Chip
                label='Clean View'
                size='small'
                onClick={() => setHideMapClutter(!hideMapClutter)}
                color={hideMapClutter ? 'primary' : 'default'}
                variant={hideMapClutter ? 'filled' : 'outlined'}
                className='cursor-pointer'
                icon={<i className={hideMapClutter ? 'tabler-map-pin-off' : 'tabler-map-pin'} />}
                sx={{
                  '& .MuiChip-label': { px: 1.5, fontWeight: 600 }
                }}
              />
            </Box>
            <Box className='flex items-center gap-2'>
              <Tooltip title={isDetached ? 'Close detached window' : 'Detach to separate window'}>
                <IconButton
                  onClick={isDetached ? handleCloseDetached : handleDetach}
                  size='small'
                  className='hover:bg-gray-200'
                >
                  <i className={isDetached ? 'tabler-x' : 'tabler-external-link'} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Map Container */}
          <Box className='flex-1 relative rounded-lg overflow-hidden'>
            {MapComponent}
          </Box>
        </Box>
      </Panel>
    </PanelGroup>
  )

  return (
    <div className='flex flex-col gap-4'>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {!isDetached ? (
          <Card>
            <CardContent className='p-0'>
              {DispatchContent}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className='p-8'>
              <Box className='flex flex-col items-center justify-center gap-4'>
                <i className='tabler-external-link text-6xl text-primary-main' />
                <Typography variant='h6' color='text.primary'>
                  Dispatch View Detached
                </Typography>
                <Typography variant='body2' color='text.secondary' className='text-center'>
                  The dispatch screen is currently displayed in a separate window.
                  <br />
                  Close the detached window to return here.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedJob ? (
            <Card className='w-80 shadow-xl opacity-90'>
              <CardContent>
                <Box className='flex items-center gap-2'>
                  <i className='tabler-briefcase text-warning-main' />
                  <Box>
                    <div className='font-semibold text-sm'>
                      {draggedJob.jobNumber || 'Draft'} - {draggedJob.clientName}
                    </div>
                    <div className='text-xs text-gray-600'>
                      {draggedJob.description}
                    </div>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Dispatch Confirmation Dialog */}
      <Dialog open={Boolean(pendingDispatch)} onClose={handleCancelDispatch}>
        <DialogTitle>Confirm Job Assignment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to assign this job to the selected technician?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDispatch} color='secondary'>
            Cancel
          </Button>
          <Button onClick={handleConfirmDispatch} variant='contained' color='primary' autoFocus>
            Confirm Dispatch
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detached Dispatch Dialog */}
      <Dialog
        open={isDetached}
        onClose={handleCloseDetached}
        maxWidth={false}
        fullWidth
        PaperProps={{
          style: {
            width: '95vw',
            height: '95vh',
            maxWidth: 'none'
          }
        }}
      >
        <DialogTitle className='flex items-center justify-between bg-primary-main text-white'>
          <Box className='flex items-center gap-2'>
            <i className='tabler-truck-delivery text-2xl' />
            <span>Dispatch Operations</span>
          </Box>
          <IconButton onClick={handleCloseDetached} size='small' sx={{ color: 'white' }}>
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>
        <DialogContent className='p-0'>
          {DispatchContent}
        </DialogContent>
      </Dialog>
    </div>
  )
}
