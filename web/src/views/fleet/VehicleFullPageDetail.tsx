'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import Paper, { PaperProps } from '@mui/material/Paper'
import Draggable from 'react-draggable'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Grid from '@mui/material/Grid'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import { toast } from 'react-toastify'

import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import SectionHeader from '@/components/SectionHeader'
import AuditFooter from '@/components/AuditFooter'
import PhotoGallerySection from '@/components/PhotoGallerySection'
import CustomTextField from '@core/components/mui/TextField'
import { api } from '@/lib/api'
import { useRequiredFieldsValidation } from '@/hooks/useRequiredFields'
import { printVehicle } from '@/utils/printVehicle'
import type { Vehicle } from './VehiclesView'

type FormData = {
  vin: string
  name: string
  vehicleTypeId: string
  year: string
  makeId: string
  model: string
  licensePlate: string
  color: string
  statusId: string
  assignedTo: string
  usageReading: string
  usageUnit: string
  fuelType: string
  notes: string
  // Service & Maintenance
  estimatedServiceLifeMiles: string
  estimatedResaleValue: string
  outOfServiceDate: string
  outOfServiceOdometer: string
  inServiceDate: string
  inServiceOdometer: string
  oilCapacity: string
  fuelTankCapacity: string
  fuelTank2Capacity: string
  // Tires & Wheels
  frontTireType: string
  frontTirePsi: string
  rearTireType: string
  rearTirePsi: string
  rearWheelDiameter: string
  // Chassis & Drivetrain
  rearAxleType: string
  wheelbase: string
  rearTrackWidth: string
  frontTrackWidth: string
  brakeSystem: string
  driveType: string
  // Transmission
  transmissionGears: string
  transmissionType: string
  transmissionBrand: string
  transmissionDescription: string
  // Engine
  engineValves: string
  engineStroke: string
  redlineRpm: string
  maxTorque: string
  maxHp: string
  engineDisplacement: string
  engineCylinders: string
  engineCompression: string
  engineCamType: string
  engineBore: string
  engineBlockType: string
  engineAspiration: string
  engineBrand: string
  // Fuel Economy
  epaCombined: string
  epaHighway: string
  epaCity: string
  // Weight & Capacity
  maxPayload: string
  baseTowingCapacity: string
  grossVehicleWeightRating: string
  curbWeight: string
  // Dimensions
  bedLength: string
  groundClearance: string
  cargoVolume: string
  passengerVolume: string
  interiorVolume: string
  length: string
  height: string
  width: string
  // Commercial
  msrp: string
  bodySubtype: string
  bodyType: string
  ownership: string
  registrationState: string
  trim: string
  quickPassId: string
  insurancePolicyNumber: string
  insuranceProvider: string
}

type LookupItem = { id: string; value: string }

interface Props {
  open: boolean
  onClose: () => void
  vehicle: Vehicle | null
  onSave: () => Promise<void>
  initialEditing?: boolean
}

function PaperComponent(props: PaperProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  return (
    <Draggable nodeRef={nodeRef as any} handle="#vehicle-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} ref={nodeRef} style={{ pointerEvents: 'auto' }} />
    </Draggable>
  )
}

/**
 * Full-page vehicle detail with specs, maintenance history, photos, and assignment.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/fleet/VehicleFullPageDetail.tsx
 */
export default function VehicleFullPageDetail({ open, onClose, vehicle, onSave, initialEditing }: Props) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDlgOpen, setDeleteDlgOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(vehicle)

  // Fetch lookups
  const { data: vehicleTypes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'vehicle_type'], queryFn: () => api.get('/api/lookups/vehicle_type') })
  const { data: vehicleMakes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'vehicle_make'], queryFn: () => api.get('/api/lookups/vehicle_make') })
  const { data: vehicleStatuses = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'vehicle_status'], queryFn: () => api.get('/api/lookups/vehicle_status') })
  const { data: teamMembers = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['team-members'],
    queryFn: async () => {
      const result = await api.get<any>('/api/users?limit=500')
      return Array.isArray(result?.data) ? result.data : []
    }
  })

  // Dynamic required fields via centralized hook
  const { isRequired } = useRequiredFieldsValidation('vehicle')

  // Sync currentVehicle with vehicle prop
  useEffect(() => {
    setCurrentVehicle(vehicle)
  }, [vehicle])

  useEffect(() => {
    if (open) setIsEditing(initialEditing ?? !currentVehicle)
  }, [open, initialEditing, currentVehicle])

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      vin: '', name: '', vehicleTypeId: '', year: '', makeId: '', model: '',
      licensePlate: '', color: '', statusId: '', assignedTo: '', usageReading: '', usageUnit: '', fuelType: '', notes: '',
      estimatedServiceLifeMiles: '', estimatedResaleValue: '', outOfServiceDate: '', outOfServiceOdometer: '',
      inServiceDate: '', inServiceOdometer: '', oilCapacity: '', fuelTankCapacity: '', fuelTank2Capacity: '',
      frontTireType: '', frontTirePsi: '', rearTireType: '', rearTirePsi: '', rearWheelDiameter: '',
      rearAxleType: '', wheelbase: '', rearTrackWidth: '', frontTrackWidth: '', brakeSystem: '', driveType: '',
      transmissionGears: '', transmissionType: '', transmissionBrand: '', transmissionDescription: '',
      engineValves: '', engineStroke: '', redlineRpm: '', maxTorque: '', maxHp: '', engineDisplacement: '',
      engineCylinders: '', engineCompression: '', engineCamType: '', engineBore: '', engineBlockType: '',
      engineAspiration: '', engineBrand: '', epaCombined: '', epaHighway: '', epaCity: '',
      maxPayload: '', baseTowingCapacity: '', grossVehicleWeightRating: '', curbWeight: '',
      bedLength: '', groundClearance: '', cargoVolume: '', passengerVolume: '', interiorVolume: '',
      length: '', height: '', width: '', msrp: '', bodySubtype: '', bodyType: '', ownership: '',
      registrationState: '', trim: '', quickPassId: '', insurancePolicyNumber: '', insuranceProvider: ''
    }
  })

  useEffect(() => {
    reset({
      vin: currentVehicle?.vin ?? '',
      name: currentVehicle?.name ?? '',
      vehicleTypeId: currentVehicle?.vehicleTypeId ?? '',
      year: currentVehicle?.year?.toString() ?? '',
      makeId: currentVehicle?.makeId ?? '',
      model: currentVehicle?.model ?? '',
      licensePlate: currentVehicle?.licensePlate ?? '',
      color: currentVehicle?.color ?? '',
      statusId: currentVehicle?.statusId ?? '',
      assignedTo: currentVehicle?.assignedTo ?? '',
      usageReading: currentVehicle?.usageReading?.toString() ?? '',
      usageUnit: currentVehicle?.usageUnit ?? '',
      fuelType: currentVehicle?.fuelType ?? '',
      notes: currentVehicle?.notes ?? '',
      estimatedServiceLifeMiles: currentVehicle?.estimatedServiceLifeMiles?.toString() ?? '',
      estimatedResaleValue: currentVehicle?.estimatedResaleValue?.toString() ?? '',
      outOfServiceDate: currentVehicle?.outOfServiceDate ?? '',
      outOfServiceOdometer: currentVehicle?.outOfServiceOdometer?.toString() ?? '',
      inServiceDate: currentVehicle?.inServiceDate ?? '',
      inServiceOdometer: currentVehicle?.inServiceOdometer?.toString() ?? '',
      oilCapacity: currentVehicle?.oilCapacity?.toString() ?? '',
      fuelTankCapacity: currentVehicle?.fuelTankCapacity?.toString() ?? '',
      fuelTank2Capacity: currentVehicle?.fuelTank2Capacity?.toString() ?? '',
      frontTireType: currentVehicle?.frontTireType ?? '',
      frontTirePsi: currentVehicle?.frontTirePsi?.toString() ?? '',
      rearTireType: currentVehicle?.rearTireType ?? '',
      rearTirePsi: currentVehicle?.rearTirePsi?.toString() ?? '',
      rearWheelDiameter: currentVehicle?.rearWheelDiameter?.toString() ?? '',
      rearAxleType: currentVehicle?.rearAxleType ?? '',
      wheelbase: currentVehicle?.wheelbase?.toString() ?? '',
      rearTrackWidth: currentVehicle?.rearTrackWidth?.toString() ?? '',
      frontTrackWidth: currentVehicle?.frontTrackWidth?.toString() ?? '',
      brakeSystem: currentVehicle?.brakeSystem ?? '',
      driveType: currentVehicle?.driveType ?? '',
      transmissionGears: currentVehicle?.transmissionGears?.toString() ?? '',
      transmissionType: currentVehicle?.transmissionType ?? '',
      transmissionBrand: currentVehicle?.transmissionBrand ?? '',
      transmissionDescription: currentVehicle?.transmissionDescription ?? '',
      engineValves: currentVehicle?.engineValves?.toString() ?? '',
      engineStroke: currentVehicle?.engineStroke?.toString() ?? '',
      redlineRpm: currentVehicle?.redlineRpm?.toString() ?? '',
      maxTorque: currentVehicle?.maxTorque?.toString() ?? '',
      maxHp: currentVehicle?.maxHp?.toString() ?? '',
      engineDisplacement: currentVehicle?.engineDisplacement?.toString() ?? '',
      engineCylinders: currentVehicle?.engineCylinders?.toString() ?? '',
      engineCompression: currentVehicle?.engineCompression ?? '',
      engineCamType: currentVehicle?.engineCamType ?? '',
      engineBore: currentVehicle?.engineBore?.toString() ?? '',
      engineBlockType: currentVehicle?.engineBlockType ?? '',
      engineAspiration: currentVehicle?.engineAspiration ?? '',
      engineBrand: currentVehicle?.engineBrand ?? '',
      epaCombined: currentVehicle?.epaCombined?.toString() ?? '',
      epaHighway: currentVehicle?.epaHighway?.toString() ?? '',
      epaCity: currentVehicle?.epaCity?.toString() ?? '',
      maxPayload: currentVehicle?.maxPayload?.toString() ?? '',
      baseTowingCapacity: currentVehicle?.baseTowingCapacity?.toString() ?? '',
      grossVehicleWeightRating: currentVehicle?.grossVehicleWeightRating?.toString() ?? '',
      curbWeight: currentVehicle?.curbWeight?.toString() ?? '',
      bedLength: currentVehicle?.bedLength?.toString() ?? '',
      groundClearance: currentVehicle?.groundClearance?.toString() ?? '',
      cargoVolume: currentVehicle?.cargoVolume?.toString() ?? '',
      passengerVolume: currentVehicle?.passengerVolume?.toString() ?? '',
      interiorVolume: currentVehicle?.interiorVolume?.toString() ?? '',
      length: currentVehicle?.length?.toString() ?? '',
      height: currentVehicle?.height?.toString() ?? '',
      width: currentVehicle?.width?.toString() ?? '',
      msrp: currentVehicle?.msrp?.toString() ?? '',
      bodySubtype: currentVehicle?.bodySubtype ?? '',
      bodyType: currentVehicle?.bodyType ?? '',
      ownership: currentVehicle?.ownership ?? '',
      registrationState: currentVehicle?.registrationState ?? '',
      trim: currentVehicle?.trim ?? '',
      quickPassId: currentVehicle?.quickPassId ?? '',
      insurancePolicyNumber: currentVehicle?.insurancePolicyNumber ?? '',
      insuranceProvider: currentVehicle?.insuranceProvider ?? '',
    })
  }, [vehicle, open, reset])

  const isNew = !currentVehicle?.id

  const onSubmit = async (data: FormData) => {
    try {
      // Convert string fields back to proper types for API
      const payload = {
        ...data,
        year: data.year ? Number(data.year) : null,
        assignedTo: data.assignedTo || null,
        usageReading: data.usageReading ? Number(data.usageReading) : null,
        usageUnit: data.usageUnit || null,
        // Service & Maintenance
        estimatedServiceLifeMiles: data.estimatedServiceLifeMiles ? Number(data.estimatedServiceLifeMiles) : null,
        estimatedResaleValue: data.estimatedResaleValue ? Number(data.estimatedResaleValue) : null,
        outOfServiceDate: data.outOfServiceDate || null,
        outOfServiceOdometer: data.outOfServiceOdometer ? Number(data.outOfServiceOdometer) : null,
        inServiceDate: data.inServiceDate || null,
        inServiceOdometer: data.inServiceOdometer ? Number(data.inServiceOdometer) : null,
        oilCapacity: data.oilCapacity ? Number(data.oilCapacity) : null,
        fuelTankCapacity: data.fuelTankCapacity ? Number(data.fuelTankCapacity) : null,
        fuelTank2Capacity: data.fuelTank2Capacity ? Number(data.fuelTank2Capacity) : null,
        // Tires & Wheels
        frontTireType: data.frontTireType || null,
        frontTirePsi: data.frontTirePsi ? Number(data.frontTirePsi) : null,
        rearTireType: data.rearTireType || null,
        rearTirePsi: data.rearTirePsi ? Number(data.rearTirePsi) : null,
        rearWheelDiameter: data.rearWheelDiameter ? Number(data.rearWheelDiameter) : null,
        // Chassis & Drivetrain
        rearAxleType: data.rearAxleType || null,
        wheelbase: data.wheelbase ? Number(data.wheelbase) : null,
        rearTrackWidth: data.rearTrackWidth ? Number(data.rearTrackWidth) : null,
        frontTrackWidth: data.frontTrackWidth ? Number(data.frontTrackWidth) : null,
        brakeSystem: data.brakeSystem || null,
        driveType: data.driveType || null,
        // Transmission
        transmissionGears: data.transmissionGears ? Number(data.transmissionGears) : null,
        transmissionType: data.transmissionType || null,
        transmissionBrand: data.transmissionBrand || null,
        transmissionDescription: data.transmissionDescription || null,
        // Engine
        engineValves: data.engineValves ? Number(data.engineValves) : null,
        engineStroke: data.engineStroke ? Number(data.engineStroke) : null,
        redlineRpm: data.redlineRpm ? Number(data.redlineRpm) : null,
        maxTorque: data.maxTorque ? Number(data.maxTorque) : null,
        maxHp: data.maxHp ? Number(data.maxHp) : null,
        engineDisplacement: data.engineDisplacement ? Number(data.engineDisplacement) : null,
        engineCylinders: data.engineCylinders ? Number(data.engineCylinders) : null,
        engineCompression: data.engineCompression || null,
        engineCamType: data.engineCamType || null,
        engineBore: data.engineBore ? Number(data.engineBore) : null,
        engineBlockType: data.engineBlockType || null,
        engineAspiration: data.engineAspiration || null,
        engineBrand: data.engineBrand || null,
        // Fuel Economy
        epaCombined: data.epaCombined ? Number(data.epaCombined) : null,
        epaHighway: data.epaHighway ? Number(data.epaHighway) : null,
        epaCity: data.epaCity ? Number(data.epaCity) : null,
        // Weight & Capacity
        maxPayload: data.maxPayload ? Number(data.maxPayload) : null,
        baseTowingCapacity: data.baseTowingCapacity ? Number(data.baseTowingCapacity) : null,
        grossVehicleWeightRating: data.grossVehicleWeightRating ? Number(data.grossVehicleWeightRating) : null,
        curbWeight: data.curbWeight ? Number(data.curbWeight) : null,
        // Dimensions
        bedLength: data.bedLength ? Number(data.bedLength) : null,
        groundClearance: data.groundClearance ? Number(data.groundClearance) : null,
        cargoVolume: data.cargoVolume ? Number(data.cargoVolume) : null,
        passengerVolume: data.passengerVolume ? Number(data.passengerVolume) : null,
        interiorVolume: data.interiorVolume ? Number(data.interiorVolume) : null,
        length: data.length ? Number(data.length) : null,
        height: data.height ? Number(data.height) : null,
        width: data.width ? Number(data.width) : null,
        // Commercial
        msrp: data.msrp ? Number(data.msrp) : null,
        bodySubtype: data.bodySubtype || null,
        bodyType: data.bodyType || null,
        ownership: data.ownership || null,
        registrationState: data.registrationState || null,
        trim: data.trim || null,
        quickPassId: data.quickPassId || null,
        insurancePolicyNumber: data.insurancePolicyNumber || null,
        insuranceProvider: data.insuranceProvider || null,
      }

      if (isNew) {
        await api.post<Vehicle>('/api/vehicles', payload)
        toast.success('Vehicle saved')
        await onSave()
        onClose()
      } else {
        await api.patch(`/api/vehicles/${currentVehicle!.id}`, payload)
        toast.success('Vehicle updated')
        await onSave()
        setIsEditing(false)
      }
    } catch (e) {
      toast.error('Failed to save vehicle')
      console.error(e)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/vehicles/${currentVehicle?.id}`),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      await onSave()
      onClose()
    },
    onError: () => toast.error('Failed to delete vehicle'),
  })

  return (
    <>
      <Dialog
        open={open}
        onClose={() => (isEditing && currentVehicle) ? setIsEditing(false) : onClose()}
        maxWidth={false}
        hideBackdrop
        disableScrollLock
        disableEnforceFocus
        transitionDuration={0}
        PaperComponent={PaperComponent}
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
          sx: { width: '60vw', maxWidth: 'none', height: '82vh', maxHeight: 'none', m: 0, borderRadius: 2 }
        }}
      >
        <DialogTitle
          id="vehicle-dialog-title"
          sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
        >
          <Box className="flex items-center gap-3">
            <Box className="flex flex-col">
              <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '0.05em', wordSpacing: '0.15em' }}>
                {isNew ? 'Add Vehicle' : isEditing ? 'Edit Vehicle' : 'Vehicle Details'}
              </Typography>
              {currentVehicle && !isNew && (
                <Box className="flex items-center gap-2 mt-0.5">
                  <Chip label={currentVehicle.status || 'Unknown'} size='small' color={currentVehicle.status?.toLowerCase() === 'active' ? 'success' : 'default'} variant='tonal' />
                  {currentVehicle.vehicleType && <Chip label={currentVehicle.vehicleType} size='small' variant='outlined' />}
                </Box>
              )}
            </Box>
          </Box>

          <Box className="flex items-center gap-2">
            {isEditing ? (
              <>
                {!isNew && (
                  <Tooltip title="Delete Vehicle">
                    <IconButton onClick={() => setDeleteDlgOpen(true)} disabled={isSubmitting} sx={{ color: 'error.main', bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}>
                      <i className="tabler-trash text-[24px]" />
                    </IconButton>
                  </Tooltip>
                )}
                <Button variant="outlined" onClick={() => isNew ? onClose() : setIsEditing(false)} disabled={isSubmitting} sx={{ borderRadius: '8px' }}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit(onSubmit, (errors) => {
                  const firstError = Object.values(errors)[0]
                  const msg = firstError?.message || 'Please fill in all required fields'
                  toast.error(String(msg))
                  // Switch to Basic tab if error is on a basic field
                  const basicFields = ['name', 'vehicleTypeId', 'vin', 'statusId', 'makeId', 'model', 'year', 'licensePlate', 'color', 'usageReading', 'usageUnit', 'fuelType', 'assignedTo']
                  if (Object.keys(errors).some(k => basicFields.includes(k))) setActiveTab(0)
                })} disabled={isSubmitting} sx={{ borderRadius: '8px', minWidth: '80px' }}>
                  {isSubmitting ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                {currentVehicle && (
                  <Tooltip title="Print Vehicle Report">
                    <IconButton onClick={() => printVehicle(currentVehicle)} sx={{ bgcolor: 'secondary.lighter', color: 'secondary.main', '&:hover': { bgcolor: 'secondary.light' } }}>
                      <i className="tabler-printer text-[28px]" />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton onClick={() => setIsEditing(true)} sx={{ bgcolor: 'primary.lighter', color: 'primary.main', '&:hover': { bgcolor: 'primary.light' } }}>
                  <i className="tabler-pencil text-[28px]" />
                </IconButton>
              </>
            )}
            <IconButton onClick={() => (isEditing && currentVehicle) ? setIsEditing(false) : onClose()} disabled={isSubmitting}>
              <i className="tabler-x" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {(isEditing || currentVehicle) ? (
            <PanelGroup direction="horizontal">
              {/* LEFT — main fields */}
              <Panel defaultSize={70} minSize={40}>
                {/* ── Tabs ── */}
                {isEditing && (
                  <Tabs
                    value={activeTab}
                    onChange={(_, val) => setActiveTab(val)}
                    variant="scrollable"
                    scrollButtons={false}
                    sx={{
                      px: 4,
                      pt: 2,
                      borderBottom: 1,
                      borderColor: 'divider',
                      '& .MuiTab-root': {
                        minWidth: 'auto',
                        px: 2,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }
                    }}
                  >
                    <Tab label='Basic' />
                    <Tab label='Service' />
                    <Tab label='Specs' />
                    <Tab label='Engine' />
                    <Tab label='Performance' />
                    <Tab label='Dimensions' />
                    <Tab
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          Commercial
                          <i className='tabler-photo text-[18px]' style={{ opacity: 0.7 }} />
                        </Box>
                      }
                    />
                  </Tabs>
                )}
                <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
                  {/* ══ TAB 0: BASIC INFO ══ */}
                  {(!isEditing || activeTab === 0) && (
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={3.5}>
                      {isEditing ? (
                        <Controller name='name' control={control} rules={{ required: 'Name is required' }}
                          render={({ field, fieldState }) => (
                            <CustomTextField {...field} fullWidth label='Vehicle Name' required placeholder='e.g. Truck #1' error={!!fieldState.error} helperText={fieldState.error?.message} sx={{ width: 'calc(100% + 10px)' }} />
                          )} />
                      ) : (
                        <><SectionHeader>Vehicle Name</SectionHeader>
                        <Typography variant="h5" fontWeight={600} sx={{ mt: 1 }}>{currentVehicle!.name}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={12} md={3}>
                      {isEditing ? (
                        <Controller name='vin' control={control}
                          rules={isRequired('vin') ? { required: 'VIN is required' } : {}}
                          render={({ field, fieldState }) => (
                            <CustomTextField {...field} fullWidth label='VIN / Serial Number' placeholder='17-digit VIN'
                              required={isRequired('vin')} error={!!fieldState.error} helperText={fieldState.error?.message}
                              sx={{ width: 'calc(100% + 6px)' }} />
                          )} />
                      ) : (
                        <><SectionHeader>VIN / Serial Number</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.vin || '—'}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={12} md={3.5}>
                      {isEditing ? (
                        <Controller name='vehicleTypeId' control={control} rules={{ required: 'Type is required' }}
                          render={({ field, fieldState }) => (
                            <CustomTextField {...field} select fullWidth label='Vehicle Type' required error={!!fieldState.error} helperText={fieldState.error?.message} SelectProps={{ native: true }}>
                              <option value="">Select Type</option>
                              {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.value}</option>)}
                            </CustomTextField>
                          )} />
                      ) : (
                        <><SectionHeader>Type</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.vehicleType || '—'}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={12} md={2}>
                      {isEditing ? (
                        <Controller name='statusId' control={control}
                          rules={isRequired('statusId') ? { required: 'Status is required' } : {}}
                          render={({ field, fieldState }) => (
                            <CustomTextField {...field} select fullWidth label='Status' SelectProps={{ native: true }}
                              required={isRequired('statusId')} error={!!fieldState.error} helperText={fieldState.error?.message}>
                              <option value="">Select Status</option>
                              {vehicleStatuses.map(s => <option key={s.id} value={s.id}>{s.value}</option>)}
                            </CustomTextField>
                          )} />
                      ) : (
                        <><SectionHeader>Status</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.status || '—'}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={12} md={3}>
                      {isEditing ? (
                        <Controller name='assignedTo' control={control}
                          rules={isRequired('assignedTo') ? { required: 'Assigned To is required' } : {}}
                          render={({ field, fieldState }) => (
                            <CustomTextField {...field} select fullWidth label='Assigned To'
                              required={isRequired('assignedTo')} error={!!fieldState.error} helperText={fieldState.error?.message}>
                              <MenuItem value=''>— Unassigned —</MenuItem>
                              {teamMembers.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                            </CustomTextField>
                          )} />
                      ) : (
                        <>
                          <SectionHeader>Assigned To</SectionHeader>
                          {currentVehicle?.assignedToName ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                              <i className='tabler-user text-primary text-[20px]' />
                              <Typography
                                variant="body1"
                                sx={{
                                  color: 'primary.main',
                                  cursor: 'pointer',
                                  '&:hover': { textDecoration: 'underline' }
                                }}
                                onClick={() => router.push(`/team?edit=${currentVehicle.assignedTo}`)}
                              >
                                {currentVehicle.assignedToName}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body1" sx={{ mt: 1 }}>—</Typography>
                          )}
                        </>
                      )}
                    </Grid>
                    <Grid item xs={12} md={4}>
                      {isEditing ? (
                        <Controller name='makeId' control={control}
                          rules={isRequired('makeId') ? { required: 'Make is required' } : {}}
                          render={({ field, fieldState }) => (
                            <CustomTextField {...field} select fullWidth label='Make' SelectProps={{ native: true }}
                              required={isRequired('makeId')} error={!!fieldState.error} helperText={fieldState.error?.message}>
                              <option value="">Select Make</option>
                              {vehicleMakes.map(m => <option key={m.id} value={m.id}>{m.value}</option>)}
                            </CustomTextField>
                          )} />
                      ) : (
                        <><SectionHeader>Make</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.make || '—'}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={12} md={4}>
                      {isEditing ? (
                        <Controller name='model' control={control}
                          rules={isRequired('model') ? { required: 'Model is required' } : {}}
                          render={({ field, fieldState }) => (
                            <CustomTextField {...field} fullWidth label='Model' placeholder='e.g. F-150, Sprinter'
                              required={isRequired('model')} error={!!fieldState.error} helperText={fieldState.error?.message}
                              sx={{ width: 'calc(100% + 8px)' }} />
                          )} />
                      ) : (
                        <><SectionHeader>Model</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.model || '—'}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={6} md={1.5}>
                      {isEditing ? (
                        <Controller name='year' control={control}
                          rules={isRequired('year') ? { required: 'Year is required' } : {}}
                          render={({ field, fieldState }) => (
                            <CustomTextField {...field} type="number" label='Year' placeholder='2021'
                              required={isRequired('year')} error={!!fieldState.error} helperText={fieldState.error?.message}
                              sx={{ maxWidth: '120px' }} />
                          )} />
                      ) : (
                        <><SectionHeader>Year</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.year || '—'}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {isEditing ? (
                        <Controller name='licensePlate' control={control}
                          rules={isRequired('licensePlate') ? { required: 'License Plate is required' } : {}}
                          render={({ field, fieldState }) => (
                            <CustomTextField {...field} fullWidth label='License Plate' placeholder='ABC-1234'
                              required={isRequired('licensePlate')} error={!!fieldState.error} helperText={fieldState.error?.message} />
                          )} />
                      ) : (
                        <><SectionHeader>License Plate</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.licensePlate || '—'}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {isEditing ? (
                        <Controller name='color' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth label='Color' placeholder='White' />
                          )} />
                      ) : (
                        <><SectionHeader>Color</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.color || '—'}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={12} md={4}>
                      {isEditing ? (
                        <Controller name='usageReading' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} type="number" fullWidth label='Odometer / Usage' placeholder='50000' />
                          )} />
                      ) : (
                        <><SectionHeader>Odometer / Usage</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.usageReading || '—'}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={12} md={3}>
                      {isEditing ? (
                        <Controller name='usageUnit' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} select fullWidth label='Unit' SelectProps={{ native: true }}>
                              <option value="">Select Unit</option>
                              <option value="miles">Miles</option>
                              <option value="kilometers">Kilometers</option>
                              <option value="hours">Hours</option>
                            </CustomTextField>
                          )} />
                      ) : (
                        <><SectionHeader>Unit</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.usageUnit || '—'}</Typography></>
                      )}
                    </Grid>
                    <Grid item xs={12} md={5}>
                      {isEditing ? (
                        <Controller name='fuelType' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth label='Fuel Type' placeholder='e.g. Diesel, Gas, Electric' />
                          )} />
                      ) : (
                        <><SectionHeader>Fuel Type</SectionHeader>
                        <Typography variant="body1" sx={{ mt: 1 }}>{currentVehicle!.fuelType || '—'}</Typography></>
                      )}
                    </Grid>
                  </Grid>
                  )}

                  {/* Gallery Section */}
                  {(!isEditing || activeTab === 0) && currentVehicle?.id && (
                    <Box sx={{ mt: 4 }}>
                      <PhotoGallerySection entityId={currentVehicle.id} entityType='vehicle' />
                    </Box>
                  )}

                  {/* ══ TAB 1: SERVICE & MAINTENANCE ══ */}
                  {isEditing && activeTab === 1 && (
                    <Grid container spacing={4}>
                      <Grid item xs={12} sm={6}>
                        <Controller name='inServiceDate' control={control}
                          rules={isRequired('inServiceDate') ? { required: 'In-Service Date is required' } : {}}
                          render={({ field, fieldState }) => (
                            <CustomTextField {...field} fullWidth type='date' label='In-Service Date' InputLabelProps={{ shrink: true }}
                              required={isRequired('inServiceDate')} error={!!fieldState.error} helperText={fieldState.error?.message} />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='lastServiceDate' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='date' label='Last Service Date' InputLabelProps={{ shrink: true }} />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='nextServiceDue' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='date' label='Next Service Due' InputLabelProps={{ shrink: true }} />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='serviceInterval' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Service Interval (miles/hours)' placeholder='5000' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='estimatedServiceLifeMiles' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Estimated Service Life (miles)' placeholder='150000' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='estimatedResaleValue' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Estimated Resale Value ($)' placeholder='25000' />
                          )} />
                      </Grid>
                    </Grid>
                  )}

                  {/* ══ TAB 2: VEHICLE SPECS ══ */}
                  {isEditing && activeTab === 2 && (
                    <>
                      <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mb: 2, letterSpacing: '0.08em' }}>
                        Tires & Wheels
                      </Typography>
                      <Grid container spacing={4}>
                        <Grid item xs={12} sm={6}>
                          <Controller name='tireSizeFront' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth label='Front Tire Size' placeholder='P265/70R17' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='tireSizeRear' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth label='Rear Tire Size' placeholder='P265/70R17' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='wheelSizeFront' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth label='Front Wheel Size' placeholder='17x8' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='wheelSizeRear' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth label='Rear Wheel Size' placeholder='17x8' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='tireCondition' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth label='Tire Condition' placeholder='Good, Fair, Poor' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='tireReplacementDate' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth type='date' label='Tire Replacement Date' InputLabelProps={{ shrink: true }} />
                            )} />
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 4 }} />

                      <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mb: 2, letterSpacing: '0.08em' }}>
                        Chassis & Drivetrain
                      </Typography>
                      <Grid container spacing={4}>
                        <Grid item xs={12} sm={6}>
                          <Controller name='driveType' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} select fullWidth label='Drive Type' SelectProps={{ native: true }}>
                                <option value="">Select Drive Type</option>
                                <option value="4x2">4x2</option>
                                <option value="4x4">4x4</option>
                                <option value="6x4">6x4</option>
                                <option value="FWD">FWD</option>
                                <option value="RWD">RWD</option>
                                <option value="AWD">AWD</option>
                              </CustomTextField>
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='chassis' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth label='Chassis' placeholder='e.g. Regular, Extended, Crew' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='bedLength' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth label='Bed Length' placeholder='e.g. 6.5 ft' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='cabType' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth label='Cab Type' placeholder='e.g. Standard, Extended, Crew' />
                            )} />
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 4 }} />

                      <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mb: 2, letterSpacing: '0.08em' }}>
                        Transmission
                      </Typography>
                      <Grid container spacing={4}>
                        <Grid item xs={12} sm={6}>
                          <Controller name='transmissionType' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} select fullWidth label='Transmission Type' SelectProps={{ native: true }}>
                                <option value="">Select Type</option>
                                <option value="Automatic">Automatic</option>
                                <option value="Manual">Manual</option>
                                <option value="Continuously Variable">Continuously Variable</option>
                                <option value="Dual-Clutch">Dual-Clutch</option>
                              </CustomTextField>
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Controller name='transmissionSpeeds' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth type='number' label='Speeds' placeholder='6' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={9}>
                          <Controller name='transmissionDescription' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth label='Transmission Description' placeholder='e.g. 10-speed automatic with SelectShift' />
                            )} />
                        </Grid>
                      </Grid>
                    </>
                  )}

                  {/* ══ TAB 3: ENGINE ══ */}
                  {isEditing && activeTab === 3 && (
                    <Grid container spacing={4}>
                      <Grid item xs={12} sm={4}>
                        <Controller name='engineType' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth label='Engine Type' placeholder='e.g. V8, Inline-4' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Controller name='engineCylinders' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Cylinders' placeholder='8' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Controller name='engineValves' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Valves' placeholder='16' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='engineDisplacement' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Displacement (L)' placeholder='5.0' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='aspirationType' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth label='Aspiration' placeholder='e.g. Naturally Aspirated, Turbocharged' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='horsepower' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Horsepower (hp)' placeholder='400' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='maxTorque' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Max Torque (lb-ft)' placeholder='410' />
                          )} />
                      </Grid>
                    </Grid>
                  )}

                  {/* ══ TAB 4: PERFORMANCE ══ */}
                  {isEditing && activeTab === 4 && (
                    <>
                      <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mb: 2, letterSpacing: '0.08em' }}>
                        Fuel Economy
                      </Typography>
                      <Grid container spacing={4}>
                        <Grid item xs={12} sm={4}>
                          <Controller name='cityMpg' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth type='number' label='City MPG' placeholder='16' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Controller name='highwayMpg' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth type='number' label='Highway MPG' placeholder='22' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Controller name='combinedMpg' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth type='number' label='Combined MPG' placeholder='18' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='tankCapacity' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth type='number' label='Tank Capacity (gallons)' placeholder='26' />
                            )} />
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 4 }} />

                      <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mb: 2, letterSpacing: '0.08em' }}>
                        Weight & Capacity
                      </Typography>
                      <Grid container spacing={4}>
                        <Grid item xs={12} sm={6}>
                          <Controller name='gvwr' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth type='number' label='GVWR (lbs)' placeholder='7000' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='curbWeight' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth type='number' label='Curb Weight (lbs)' placeholder='4800' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='payloadCapacity' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth type='number' label='Payload Capacity (lbs)' placeholder='2200' />
                            )} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller name='towingCapacity' control={control}
                            render={({ field }) => (
                              <CustomTextField {...field} fullWidth type='number' label='Towing Capacity (lbs)' placeholder='8000' />
                            )} />
                        </Grid>
                      </Grid>
                    </>
                  )}

                  {/* ══ TAB 5: DIMENSIONS ══ */}
                  {isEditing && activeTab === 5 && (
                    <Grid container spacing={4}>
                      <Grid item xs={12} sm={6}>
                        <Controller name='overallLength' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Overall Length (inches)' placeholder='231' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='overallWidth' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Overall Width (inches)' placeholder='80' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='overallHeight' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Overall Height (inches)' placeholder='76' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='wheelbase' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Wheelbase (inches)' placeholder='145' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='groundClearance' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Ground Clearance (inches)' placeholder='9' />
                          )} />
                      </Grid>
                    </Grid>
                  )}

                  {/* ══ TAB 6: COMMERCIAL ══ */}
                  {isEditing && activeTab === 6 && (
                    <Grid container spacing={4}>
                      <Grid item xs={12} sm={6}>
                        <Controller name='purchaseDate' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='date' label='Purchase Date' InputLabelProps={{ shrink: true }} />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='purchasePrice' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='number' label='Purchase Price ($)' placeholder='45000' />
                          )} />
                      </Grid>
                      <Grid item xs={12}>
                        <Controller name='purchaseLocation' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth label='Purchase Location' placeholder='Dealer name or location' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='warrantyExpiration' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='date' label='Warranty Expiration' InputLabelProps={{ shrink: true }} />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='registrationExpiration' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth type='date' label='Registration Expiration' InputLabelProps={{ shrink: true }} />
                          )} />
                      </Grid>
                      <Grid item xs={12}>
                        <Controller name='titleNumber' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth label='Title Number' placeholder='Title or certificate number' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='quickPassId' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth label='Quick Pass ID' placeholder='Toll tag or transponder ID' />
                          )} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller name='insurancePolicyNumber' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth label='Insurance Policy Number' placeholder='Policy number' />
                          )} />
                      </Grid>
                      <Grid item xs={12}>
                        <Controller name='insuranceProvider' control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth label='Insurance Provider' placeholder='Insurance company name' />
                          )} />
                      </Grid>
                    </Grid>
                  )}
                </Box>
              </Panel>

              {/* SPLITTER */}
              <PanelResizeHandle className="w-2 bg-gray-100 border-x border-gray-200 cursor-col-resize flex items-center justify-center transition-colors hover:bg-primary-light">
                <div className="h-8 w-0.5 bg-gray-400 rounded-full" />
              </PanelResizeHandle>

              {/* RIGHT — notes */}
              <Panel defaultSize={30} minSize={20} className="flex flex-col border-l border-divider">
                <Box sx={{ p: 3, flex: 1, overflowY: 'auto', bgcolor: 'action.hover' }}>
                  <SectionHeader
                    action={
                      !isEditing && (
                        <IconButton size="small" onClick={() => setIsEditing(true)} sx={{ color: 'primary.main' }}>
                          <i className="tabler-pencil text-base" />
                        </IconButton>
                      )
                    }
                  >
                    Notes
                  </SectionHeader>
                  {isEditing ? (
                    <Box sx={{ mt: 2 }}>
                      <Controller name='notes' control={control}
                        render={({ field }) => (
                          <CustomTextField {...field} fullWidth multiline rows={10} placeholder='Additional notes about this vehicle…' sx={{ '& .MuiInputBase-root': { bgcolor: 'background.paper' } }} />
                        )} />
                    </Box>
                  ) : (
                    currentVehicle?.notes ? (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main', borderRadius: 2 }}>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{currentVehicle.notes}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>No notes provided.</Typography>
                    )
                  )}

                  <Divider sx={{ my: 3 }} />

                  <SectionHeader
                    action={
                      !isEditing && (
                        <IconButton size="small" onClick={() => setIsEditing(true)} sx={{ color: 'primary.main' }}>
                          <i className="tabler-pencil text-base" />
                        </IconButton>
                      )
                    }
                  >
                    Maintenance Notes
                  </SectionHeader>
                  {isEditing ? (
                    <Box sx={{ mt: 2 }}>
                      <Controller name='maintenanceNotes' control={control}
                        render={({ field }) => (
                          <CustomTextField {...field} fullWidth multiline rows={8} placeholder='Service history, recurring issues, maintenance schedules…' sx={{ '& .MuiInputBase-root': { bgcolor: 'background.paper' } }} />
                        )} />
                    </Box>
                  ) : (
                    currentVehicle?.maintenanceNotes ? (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', border: 1, borderColor: 'info.main', borderRadius: 2 }}>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{currentVehicle.maintenanceNotes}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>No maintenance notes.</Typography>
                    )
                  )}

                  {currentVehicle && !isNew && (
                    <Box sx={{ mt: 4 }}>
                      <PhotoGallerySection entityId={currentVehicle.id} entityType="vehicle" />
                    </Box>
                  )}
                </Box>
              </Panel>
            </PanelGroup>
          ) : null}
        </DialogContent>

        {currentVehicle && !isNew && (
          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'center' }}>
            <AuditFooter creAt={currentVehicle.creAt} creBy={currentVehicle.creBy} modAt={currentVehicle.modAt} modBy={currentVehicle.modBy} divider={false} />
          </DialogActions>
        )}
      </Dialog>

      <Dialog open={deleteDlgOpen} onClose={() => setDeleteDlgOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Delete Vehicle?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete "<strong>{currentVehicle?.name}</strong>". This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDlgOpen(false)}>Cancel</Button>
          <Button color='error' variant='contained' onClick={() => { deleteMutation.mutate(); setDeleteDlgOpen(false) }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
