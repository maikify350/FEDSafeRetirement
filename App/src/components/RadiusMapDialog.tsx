'use client'

/**
 * RadiusMapDialog — Full-panel Google Maps dialog showing the search radius
 * as a shaded circle overlay with the center point marked.
 *
 * Uses the Google Maps JavaScript API (loaded dynamically) to render:
 *   - A map centered on the search coordinates
 *   - A shaded circle showing the search radius
 *   - A marker at the center point
 *   - Optional small markers for each unique federal facility (post offices /
 *     agencies) inside the radius. Toggleable via the header chip.
 *   - An optional "look-beyond" outer ring controlled by an extra-radius
 *     input. Facilities falling between the inner and outer rings are drawn
 *     in a different color so the user can decide whether expanding the
 *     baseline radius would pick up worthwhile leads.
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Paper, { type PaperProps } from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Draggable from 'react-draggable'

const RADIUS_MAP_TITLE_ID = 'radius-map-dialog-title'

// Propagates the maximized flag to DraggablePaper without changing
// PaperComponent identity (which would force MUI to remount the dialog
// contents and orphan the Google Map instance).
const RadiusMaximizedContext = createContext(false)

function DraggablePaper(props: PaperProps) {
  const isMax = useContext(RadiusMaximizedContext)
  const nodeRef = useRef<HTMLDivElement>(null)

  
return (
    <Draggable
      nodeRef={nodeRef as any}
      handle={`#${RADIUS_MAP_TITLE_ID}`}
      cancel='[class*="MuiDialogContent-root"], input, button, [role="combobox"]'
      disabled={isMax}
      position={isMax ? { x: 0, y: 0 } : undefined}
    >
      <Paper {...props} ref={nodeRef} style={{ ...props.style, pointerEvents: 'auto' }} />
    </Draggable>
  )
}

interface FacilityMarker {
  facility_name: string | null
  facility_address: string | null
  facility_city: string | null
  facility_state: string | null
  lat: number
  lon: number
  lead_count: number
  distance_miles: number
}

interface GeocodedZone {
  address: string
  lat: number
  lon: number
  radius: number
}

interface RadiusMapDialogProps {
  open: boolean
  onClose: () => void
  center: { lat: number; lon: number }
  radiusMiles: number
  address: string
  total: number
  stateCounts?: { facility_state: string; lead_count: number }[]
  exclusionZones?: GeocodedZone[]
}

const milesToMeters = (miles: number) => miles * 1609.344

const zoomFor = (miles: number) =>
  miles <= 5  ? 12 :
  miles <= 15 ? 11 :
  miles <= 25 ? 10 :
  miles <= 50 ? 9  :
  miles <= 75 ? 8  :
  miles <= 150 ? 7 :
  6

export default function RadiusMapDialog({
  open,
  onClose,
  center,
  radiusMiles,
  address,
  total,
  stateCounts,
  exclusionZones,
}: RadiusMapDialogProps) {
  const isExclusionMode = exclusionZones && exclusionZones.length > 0
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const innerCircleRef = useRef<google.maps.Circle | null>(null)
  const outerCircleRef = useRef<google.maps.Circle | null>(null)
  const exclusionCirclesRef = useRef<google.maps.Circle[]>([])
  const exclusionMarkersRef = useRef<google.maps.Marker[]>([])
  const facilityMarkersRef = useRef<google.maps.Marker[]>([])
  const facilityInfoRef = useRef<google.maps.InfoWindow | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const [facilities, setFacilities] = useState<FacilityMarker[] | null>(null)
  const [facilitiesLoading, setFacilitiesLoading] = useState(false)
  const [showFacilities, setShowFacilities] = useState(true)

  // Extra "look-beyond" radius (mi). Default 25 mi so the outer ring is on by default.
  const [extendedRadius, setExtendedRadius] = useState(25)
  const [extendedInput, setExtendedInput] = useState('25')
  const [lookBeyondOn, setLookBeyondOn] = useState(true)

  const [maximized, setMaximized] = useState(false)

  const totalRadius = radiusMiles + extendedRadius

  // ── Load Google Maps script + init map when dialog opens ───────────────
  useEffect(() => {
    if (!open) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

    if (!apiKey) return

    if (window.google?.maps) {
      initMap()
      
return
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')

    if (existingScript) {
      existingScript.addEventListener('load', initMap)
      
return
    }

    const script = document.createElement('script')

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`
    script.async = true
    script.defer = true
    script.onload = initMap
    document.head.appendChild(script)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, center.lat, center.lon, radiusMiles])

  // ── Lazy-load facilities; refetch when total radius changes ────────────
  // Only for inclusion mode — exclusion mode doesn't use a single radius center
  useEffect(() => {
    if (!open || isExclusionMode) return

    let cancelled = false

    setFacilitiesLoading(true)

    const params = new URLSearchParams({
      lat:        String(center.lat),
      lon:        String(center.lon),
      radius:     String(totalRadius),
      page:       '0',
      pageSize:   '1',
      facilities: 'true',
    })

    fetch(`/api/leads/radius?${params}`)
      .then(r => r.json())
      .then((json) => {
        if (cancelled) return
        setFacilities(json.facilities ?? [])
      })
      .catch(() => { if (!cancelled) setFacilities([]) })
      .finally(() => { if (!cancelled) setFacilitiesLoading(false) })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, center.lat, center.lon, totalRadius, isExclusionMode])

  // ── Reset state when closing ───────────────────────────────────────────
  useEffect(() => {
    if (open) return
    setFacilities(null)
    setMapLoaded(false)
    setExtendedRadius(25)
    setExtendedInput('25')
    setLookBeyondOn(true)
    setMaximized(false)
    facilityMarkersRef.current.forEach(m => m.setMap(null))
    facilityMarkersRef.current = []
    facilityInfoRef.current?.close()
    facilityInfoRef.current = null
    innerCircleRef.current?.setMap(null)
    innerCircleRef.current = null
    outerCircleRef.current?.setMap(null)
    outerCircleRef.current = null
    exclusionCirclesRef.current.forEach(c => c.setMap(null))
    exclusionCirclesRef.current = []
    exclusionMarkersRef.current.forEach(m => m.setMap(null))
    exclusionMarkersRef.current = []
    mapInstanceRef.current = null
  }, [open])

  // ── Trigger Google Maps resize when dialog dimensions change ───────────
  useEffect(() => {
    const map = mapInstanceRef.current

    if (!map || !window.google?.maps) return

    const t = window.setTimeout(() => {
      const center = map.getCenter()

      google.maps.event.trigger(map, 'resize')
      if (center) map.setCenter(center)
    }, 220)

    
return () => window.clearTimeout(t)
  }, [maximized, mapLoaded])

  // ── Manage outer "look-beyond" circle and re-zoom when extended changes ─
  useEffect(() => {
    const map = mapInstanceRef.current

    if (!map || !window.google?.maps) return

    if (outerCircleRef.current) {
      outerCircleRef.current.setMap(null)
      outerCircleRef.current = null
    }

    if (extendedRadius > 0) {
      outerCircleRef.current = new google.maps.Circle({
        map,
        center: { lat: center.lat, lng: center.lon },
        radius: milesToMeters(totalRadius),
        fillColor: '#dc2626',
        fillOpacity: 0.05,
        strokeColor: '#dc2626',
        strokeOpacity: 0.5,
        strokeWeight: 1.5,
        // @ts-ignore -- strokePattern is valid but missing from @types/google.maps
        strokePattern: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 }, offset: '0', repeat: '20px' }],
      })
    }

    map.setZoom(zoomFor(totalRadius))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extendedRadius, mapLoaded, center.lat, center.lon, radiusMiles])

  // ── Render facility markers (split inner / outer) ──────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !window.google?.maps) return

    facilityMarkersRef.current.forEach(m => m.setMap(null))
    facilityMarkersRef.current = []
    facilityInfoRef.current?.close()

    if (!showFacilities || !facilities || facilities.length === 0) return

    if (!facilityInfoRef.current) {
      facilityInfoRef.current = new google.maps.InfoWindow()
    }

    const infoWindow = facilityInfoRef.current

    facilities.forEach((f) => {
      const isOuter     = f.distance_miles > radiusMiles
      // Purple for inside-radius, red for beyond radius
      const pinFill     = isOuter ? '#dc2626' : '#7c3aed'
      const pinStroke   = isOuter ? '#7f1d1d' : '#4c1d95'
      // Scale pin size logarithmically with lead count (min 2.2, max 4.0)
      const pinScale    = Math.min(4.0, Math.max(2.2, 1.6 + Math.log10(f.lead_count + 1) * 0.7))

      const addrLine = [f.facility_address, f.facility_city, f.facility_state]
        .filter(Boolean).join(', ')

      const ringLabel = isOuter
        ? `<span style="color:#dc2626;font-weight:700;">🔴 +${(f.distance_miles - radiusMiles).toFixed(1)} mi beyond search radius</span>`
        : ''

      const tooltipHtml = `
        <div style="font-family:system-ui,sans-serif;padding:10px 12px;max-width:270px;line-height:1.5;">
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <span style="font-size:22px;line-height:1;flex-shrink:0;">🏣</span>
            <strong style="font-size:13.5px;color:#1e293b;line-height:1.3;">${f.facility_name ?? 'Unknown facility'}</strong>
          </div>
          ${addrLine ? `<div style="font-size:11.5px;color:#64748b;margin-bottom:8px;">${addrLine}</div>` : ''}
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="background:${pinFill};color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">
              ${f.lead_count.toLocaleString()} lead${f.lead_count === 1 ? '' : 's'}
            </span>
            <span style="color:#94a3b8;font-size:11.5px;">${f.distance_miles.toFixed(1)} mi away</span>
          </div>
          ${ringLabel ? `<div style="margin-top:6px;font-size:11px;">${ringLabel}</div>` : ''}
        </div>
      `

      // Lead count label — abbreviate if >= 100
      const labelText = f.lead_count >= 1000
        ? `${(f.lead_count / 1000).toFixed(1)}k`
        : String(f.lead_count)

      const marker = new google.maps.Marker({
        map,
        position: { lat: f.lat, lng: f.lon },
        title: `${f.facility_name ?? 'Facility'} — ${f.lead_count.toLocaleString()} leads`,
        icon: {
          // Standard Google teardrop / drop-pin path (viewBox 0 0 24 24)
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor:   pinFill,
          fillOpacity: 1,
          strokeColor: pinStroke,
          strokeWeight: 1.5,
          scale: pinScale,
          anchor:      new google.maps.Point(12, 22),
          labelOrigin: new google.maps.Point(12, 8.5),
        },
        label: {
          text:       labelText,
          color:      '#fff',
          fontSize:   labelText.length > 3 ? '7px' : '8px',
          fontWeight: '800',
          fontFamily: 'system-ui,sans-serif',
        },
        zIndex: isOuter ? 40 : 60,
      })

      marker.addListener('mouseover', () => {
        infoWindow.setContent(tooltipHtml)
        infoWindow.open({ map, anchor: marker })
      })
      marker.addListener('mouseout', () => {
        infoWindow.close()
      })
      marker.addListener('click', () => {
        infoWindow.setContent(tooltipHtml)
        infoWindow.open({ map, anchor: marker })
      })

      facilityMarkersRef.current.push(marker)
    })
  }, [facilities, showFacilities, mapLoaded, radiusMiles])

  function initMap() {
    if (!mapRef.current || !window.google?.maps) return

    const latLng = { lat: center.lat, lng: center.lon }

    const map = new google.maps.Map(mapRef.current, {
      center: latLng,
      zoom: zoomFor(totalRadius),
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    })

    mapInstanceRef.current = map

    // ── Draw inclusion circle (Seminar mode) OR exclusion circles (Webinar mode)
    if (isExclusionMode && exclusionZones) {
      // Exclusion mode: draw a red circle for each zone
      exclusionZones.forEach((zone, idx) => {
        const zoneCenter = { lat: zone.lat, lng: zone.lon }

        const circle = new google.maps.Circle({
          map,
          center: zoneCenter,
          radius: milesToMeters(zone.radius),
          fillColor: '#dc2626',
          fillOpacity: 0.15,
          strokeColor: '#dc2626',
          strokeOpacity: 0.7,
          strokeWeight: 2.5,
        })

        exclusionCirclesRef.current.push(circle)

        // Numbered marker at each exclusion zone center
        const marker = new google.maps.Marker({
          map,
          position: zoneCenter,
          title: `Exclusion Zone ${idx + 1}: ${zone.address} (${zone.radius} mi)`,
          label: {
            text: String(idx + 1),
            color: '#fff',
            fontWeight: '800',
            fontSize: '12px',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: '#dc2626',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
          },
          zIndex: 100,
        })

        exclusionMarkersRef.current.push(marker)
      })

      // Fit bounds to show all exclusion zones
      const bounds = new google.maps.LatLngBounds()

      exclusionZones.forEach(z => {
        const latDeg = z.radius / 69.0
        const lonDeg = z.radius / (69.0 * Math.cos(z.lat * Math.PI / 180))

        bounds.extend({ lat: z.lat - latDeg, lng: z.lon - lonDeg })
        bounds.extend({ lat: z.lat + latDeg, lng: z.lon + lonDeg })
      })
      map.fitBounds(bounds, 40)
    } else {
      // Inclusion mode: single circle
      innerCircleRef.current = new google.maps.Circle({
        map,
        center: latLng,
        radius: milesToMeters(radiusMiles),
        fillColor: '#7c3aed',
        fillOpacity: 0.12,
        strokeColor: '#7c3aed',
        strokeOpacity: 0.6,
        strokeWeight: 2,
      })

      new google.maps.Marker({
        map,
        position: latLng,
        title: address,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#7c3aed',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
        zIndex: 100,
      })
    }

    setMapLoaded(true)
  }

  // Counts split by ring
  const innerFacilities = (facilities ?? []).filter(f => f.distance_miles <= radiusMiles)
  const outerFacilities = (facilities ?? []).filter(f => f.distance_miles >  radiusMiles)
  const outerLeadSum    = outerFacilities.reduce((s, f) => s + f.lead_count, 0)
  const facilityCount   = facilities?.length ?? 0

  const commitExtended = () => {
    const n = Math.max(1, Math.min(200, parseInt(extendedInput) || 25))

    setExtendedInput(String(n))
    setExtendedRadius(n)
  }

  const toggleLookBeyond = () => {
    if (lookBeyondOn) {
      setLookBeyondOn(false)
      setExtendedRadius(0)
      setExtendedInput('25')
    } else {
      setLookBeyondOn(true)
      const n = Math.max(1, Math.min(200, parseInt(extendedInput) || 25))
      setExtendedInput(String(n))
      setExtendedRadius(n)
    }
  }

  return (
    <RadiusMaximizedContext.Provider value={maximized}>
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperComponent={DraggablePaper}
      PaperProps={{
        sx: {
          width:     maximized ? '100vw' : '70vw',
          height:    maximized ? '100vh' : '85vh',
          maxWidth:  maximized ? '100vw' : '1200px',
          maxHeight: maximized ? '100vh' : '85vh',
          m:         maximized ? 0 : undefined,
          borderRadius: maximized ? 0 : 3,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        },
      }}
    >
      <DialogTitle
        id={RADIUS_MAP_TITLE_ID}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          py: 1.5,
          px: 2.5,
          background: isExclusionMode
            ? 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)'
            : 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
          color: '#fff',
          cursor: maximized ? 'default' : 'move',
          userSelect: 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <i className='tabler-radar-2' style={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='subtitle1' fontWeight={700} color='inherit' noWrap>
              Radius Search — {total.toLocaleString()} Leads
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant='caption' color='rgba(255,255,255,0.8)' noWrap>
                {address}
              </Typography>
              <Chip
                label={`${radiusMiles} mi`}
                size='small'
                sx={{
                  height: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                }}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {/* Look-beyond toggle button + distance input */}
          <Tooltip title={lookBeyondOn ? 'Click to hide outside-radius facilities (red dots)' : 'Click to show facilities beyond the search radius as red dots'}>
            <Box
              onClick={toggleLookBeyond}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: lookBeyondOn ? 'rgba(220,38,38,0.85)' : 'rgba(255,255,255,0.12)',
                border: `1px solid ${lookBeyondOn ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.25)'}`,
                borderRadius: 1.5,
                px: 1,
                py: 0.4,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: lookBeyondOn ? 'rgba(220,38,38,1)' : 'rgba(255,255,255,0.2)',
                },
              }}
            >
              <span style={{ fontSize: 13 }}>🔴</span>
              <Typography variant='caption' sx={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>
                {lookBeyondOn ? `+${extendedRadius}mi beyond` : 'Show beyond'}
              </Typography>
            </Box>
          </Tooltip>

          {/* Distance input — only visible when look-beyond is ON */}
          {lookBeyondOn && (
            <Tooltip title='Adjust how many miles beyond the search radius to show (red dots)'>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.4,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 1,
                  px: 0.75,
                  py: 0.25,
                }}
              >
                <input
                  type='number'
                  value={extendedInput}
                  min={1}
                  max={200}
                  step={5}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setExtendedInput(e.target.value)}
                  onBlur={commitExtended}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  style={{
                    width: 44,
                    padding: '2px 4px',
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
                <Typography variant='caption' sx={{ color: '#fff', fontWeight: 700, opacity: 0.85, fontSize: 11 }}>
                  mi
                </Typography>
              </Box>
            </Tooltip>
          )}

          {/* Outer-ring summary chip */}
          {lookBeyondOn && extendedRadius > 0 && outerFacilities.length > 0 && (
            <Tooltip
              title={`${outerFacilities.length.toLocaleString()} facilities ${extendedRadius} mi beyond your ${radiusMiles}-mi radius — ${outerLeadSum.toLocaleString()} total leads. Widen your radius to capture them.`}
            >
              <Chip
                label={`+${outerLeadSum.toLocaleString()} leads in +${extendedRadius}mi`}
                size='small'
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: 'rgba(220,38,38,0.9)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              />
            </Tooltip>
          )}

          {/* Facility toggle */}
          <Tooltip
            title={
              facilitiesLoading
                ? 'Loading facilities…'
                : showFacilities
                  ? `Hide markers — ${innerFacilities.length} inside${extendedRadius > 0 ? `, ${outerFacilities.length} beyond` : ''}`
                  : `Show markers — ${innerFacilities.length} inside${extendedRadius > 0 ? `, ${outerFacilities.length} beyond` : ''}`
            }
          >
            <Chip
              icon={<i className='tabler-building-community' style={{ fontSize: 16, color: '#fff', marginLeft: 8 }} />}
              label={
                facilitiesLoading
                  ? '…'
                  : extendedRadius > 0
                    ? `${innerFacilities.length} + ${outerFacilities.length}`
                    : `${facilityCount.toLocaleString()} ${facilityCount === 1 ? 'facility' : 'facilities'}`
              }
              size='small'
              clickable
              onClick={() => setShowFacilities(v => !v)}
              sx={{
                height: 24,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: showFacilities ? 'rgba(245,158,11,0.95)' : 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                '&:hover': {
                  bgcolor: showFacilities ? 'rgba(245,158,11,1)' : 'rgba(255,255,255,0.25)',
                },
              }}
            />
          </Tooltip>

          {/* State count chips */}
          {stateCounts && stateCounts.slice(0, 6).map((sc, index) => {
            const colors = [
              'rgba(239, 68, 68, 0.85)',
              'rgba(249, 115, 22, 0.85)',
              'rgba(16, 185, 129, 0.85)',
              'rgba(6, 182, 212, 0.85)',
              'rgba(139, 92, 246, 0.85)',
              'rgba(236, 72, 153, 0.85)',
            ]

            
return (
              <Chip
                key={sc.facility_state}
                label={`${sc.facility_state}: ${Number(sc.lead_count).toLocaleString()}`}
                size='small'
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 600,
                  bgcolor: colors[index % colors.length],
                  color: '#fff',
                }}
              />
            )
          })}
          <Tooltip title={maximized ? 'Restore' : 'Maximize'}>
            <IconButton
              size='small'
              onClick={() => setMaximized(v => !v)}
              sx={{
                color: 'rgba(255,255,255,0.85)',
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' },
              }}
            >
              <i
                className={maximized ? 'tabler-arrows-minimize' : 'tabler-arrows-maximize'}
                style={{ fontSize: 18 }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title='Close'>
            <IconButton
              size='small'
              onClick={onClose}
              sx={{
                color: 'rgba(255,255,255,0.85)',
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' },
              }}
            >
              <i className='tabler-x' style={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!mapLoaded && (
          <Skeleton
            variant='rectangular'
            width='100%'
            height='100%'
            sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
            animation='wave'
          />
        )}
        <div
          ref={mapRef}
          style={{ width: '100%', flex: 1, minHeight: 0 }}
        />
      </DialogContent>
    </Dialog>
    </RadiusMaximizedContext.Provider>
  )
}

