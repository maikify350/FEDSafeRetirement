'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

import { api } from '@/lib/api'
import { getThumbUrl } from '@/lib/imageUtils'
import type { Photo, PhotoCategory } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


// ─── Types ───────────────────────────────────────────────────────────────────
interface GalleryListResponse { photos: Photo[]; total: number; limit: number; offset: number }
interface GalleryStats        { total: number; byCategory: Record<string, number> }

// ─── Colour presets for the header bar ───────────────────────────────────────
const HEADER_COLORS = [
  { label: 'Dark',    bg: COLORS.galleryDark, text: COLORS.white },
  { label: 'Mocha',  bg: COLORS.galleryBrown, text: COLORS.white },
  { label: 'Teal',   bg: COLORS.galleryTeal, text: COLORS.white },
  { label: 'Violet', bg: COLORS.brandPrimary, text: COLORS.white },
  { label: 'Slate',  bg: COLORS.graySlate, text: COLORS.white },
  { label: 'Rose',   bg: COLORS.galleryPink, text: COLORS.white },
]

// ─── Category filter config ───────────────────────────────────────────────────
const CATEGORY_FILTERS: { key: 'all' | PhotoCategory; label: string; icon: string }[] = [
  { key: 'all',       label: 'All',        icon: 'tabler-photo'           },
  { key: 'general',   label: 'General',    icon: 'tabler-globe'           },
  { key: 'client',    label: 'Client',     icon: 'tabler-user'            },
  { key: 'job',       label: 'Job',        icon: 'tabler-briefcase'       },
  { key: 'quote',     label: 'Quote',      icon: 'tabler-file-description'},
  { key: 'request',   label: 'Request',    icon: 'tabler-clipboard-list'  },
  { key: 'invoice',   label: 'Invoice',    icon: 'tabler-receipt-2'       },
  { key: 'address',   label: 'Address',    icon: 'tabler-map-pin'         },
  { key: 'vendor',    label: 'Vendor',     icon: 'tabler-building-store'  },
  { key: 'vehicle',   label: 'Fleet',      icon: 'tabler-truck'           },
]

/**
 * Full photo gallery view with grid layout, category filters, lightbox preview, and batch operations.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/gallery/GalleryView.tsx
 */
export default function GalleryView() {
  const router       = useRouter()
  const queryClient  = useQueryClient()

  const [headerColor,    setHeaderColor]    = useState(HEADER_COLORS[0])
  const [activeCategory, setActiveCategory] = useState<'all' | PhotoCategory>('all')
  const [search,         setSearch]         = useState('')
  const [selectedPhoto,  setSelectedPhoto]  = useState<Photo | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState(false)

  // ── Queries ──
  const { data: photosData, isLoading, refetch } = useQuery<GalleryListResponse>({
    queryKey: ['photos', activeCategory],
    queryFn:  () => {
      const params = new URLSearchParams()
      if (activeCategory !== 'all') params.set('category', activeCategory)
      params.set('limit', '200')
      const qs = params.toString()
      return api.get<GalleryListResponse>(`/api/photos${qs ? '?' + qs : ''}`)
    },
    staleTime: 0,
    refetchOnMount: true,
  })

  const { data: stats } = useQuery<GalleryStats>({
    queryKey: ['photos', 'stats'],
    queryFn:  () => api.get<GalleryStats>('/api/photos/stats'),
    staleTime: 0,
  })

  // ── Delete mutation ──
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/photos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
      setSelectedPhoto(null)
      setConfirmDelete(false)
    },
  })

  // ── Filter by search term client-side ──
  const photos: Photo[] = (photosData?.photos ?? []).filter(p => {
    if (!search) return true
    return p.caption?.toLowerCase().includes(search.toLowerCase()) ||
           p.category.toLowerCase().includes(search.toLowerCase())
  })

  const getCategoryCount = (key: 'all' | PhotoCategory) => {
    if (!stats) return 0
    if (key === 'all') return stats.total
    return stats.byCategory?.[key] ?? 0
  }

  return (
    // margin: -24px cancels StyledMain padding → gallery fills its content column
    // without overlapping the sidebar; sidebar state is respected automatically.
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        margin:        '-4px -24px -24px -24px',
        height:        'calc(100vh - 64px)',
        overflow:      'hidden',
        background:    'var(--mui-palette-background-default)',
      }}
    >
      {/* ── Coloured title bar ── */}
      <div
        style={{ background: headerColor.bg, color: headerColor.text, height: 48, minHeight: 48, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}
      >
        <Tooltip title='Back to Dashboard'>
          <IconButton size='small' onClick={() => router.push('/')} sx={{ color: headerColor.text }}>
            <i className='tabler-arrow-left text-lg' />
          </IconButton>
        </Tooltip>
        <i className='tabler-photo text-lg' />
        <Typography variant='subtitle1' fontWeight={600} sx={{ color: headerColor.text, flex: 1 }}>
          Gallery  {stats && <span style={{ fontWeight: 400, fontSize: '0.85em' }}>({stats.total})</span>}
        </Typography>

        {/* Refresh */}
        <Tooltip title='Refresh'>
          <IconButton size='small' onClick={() => refetch()} sx={{ color: headerColor.text }}>
            <i className='tabler-refresh text-base' />
          </IconButton>
        </Tooltip>

        {/* Colour swatches */}
        <div style={{ display: 'flex', gap: 4, marginRight: 4 }}>
          {HEADER_COLORS.map(c => (
            <button key={c.label} title={c.label} onClick={() => setHeaderColor(c)}
              style={{ width: 16, height: 16, borderRadius: '50%', background: c.bg, border: `2px solid ${c.bg === headerColor.bg ? COLORS.white : 'transparent'}`, cursor: 'pointer', outline: c.bg === headerColor.bg ? `2px solid ${c.bg}` : 'none', outlineOffset: 1, transition: 'transform 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            />
          ))}
        </div>

        <Tooltip title='Close'>
          <IconButton size='small' onClick={() => router.push('/')} sx={{ color: headerColor.text }}>
            <i className='tabler-x text-lg' />
          </IconButton>
        </Tooltip>
      </div>

      {/* ── Toolbar: search + category filter chips ── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--mui-palette-divider)', background: 'var(--mui-palette-background-paper)', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <i className='tabler-search text-base' style={{ position: 'absolute', left: 10, color: 'var(--mui-palette-text-disabled)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search by caption or category…'
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 6, paddingBottom: 6, fontSize: 14, borderRadius: 8, border: '1px solid var(--mui-palette-divider)', background: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)', outline: 'none', width: '100%', maxWidth: 360 }}
          />
        </div>

        {/* Category chips — match mobile filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {CATEGORY_FILTERS.map(f => {
            const count = getCategoryCount(f.key)
            const active = activeCategory === f.key
            return (
              <button key={f.key} onClick={() => setActiveCategory(f.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: active ? 600 : 400, border: 'none', cursor: 'pointer', background: active ? headerColor.bg : 'var(--mui-palette-action-hover)', color: active ? headerColor.text : 'var(--mui-palette-text-secondary)', transition: 'all 0.15s' }}
              >
                <i className={`${f.icon} text-sm`} />
                {f.label}
                <span style={{ background: active ? 'rgba(255,255,255,0.25)' : 'var(--mui-palette-action-selected)', borderRadius: 999, padding: '0 6px', fontSize: 11, fontWeight: 600 }}>{count}</span>
              </button>
            )
          })}
          <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
            {photos.length} shown
          </Typography>
        </div>
      </div>

      {/* ── Photo grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
          </div>
        ) : photos.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--mui-palette-text-disabled)', gap: 8 }}>
            <i className='tabler-photo-off text-5xl' />
            <Typography variant='body2'>No items in this category yet</Typography>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {photos.map(photo => (
              <div key={photo.id}
                style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--mui-palette-background-paper)', border: '1px solid var(--mui-palette-divider)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => setSelectedPhoto(photo)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
              >
                <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getThumbUrl(photo.url, { width: 400, height: 300 })} alt={photo.caption || photo.category} loading='lazy'
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Category badge */}
                  <span style={{ position: 'absolute', top: 6, left: 6, background: headerColor.bg, color: headerColor.text, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, textTransform: 'capitalize' }}>
                    {photo.category}
                  </span>
                </div>
                {photo.caption && (
                  <div style={{ padding: '6px 10px' }}>
                    <Typography variant='caption' color='text.secondary' noWrap>{photo.caption}</Typography>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Photo detail dialog ── */}
      <Dialog open={!!selectedPhoto && !confirmDelete} onClose={() => setSelectedPhoto(null)} maxWidth='md' fullWidth>
        {selectedPhoto && (
          <>
            <DialogContent sx={{ p: 0, position: 'relative', background: COLORS.black }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPhoto.url} alt={selectedPhoto.caption || selectedPhoto.category}
                loading='eager'
                style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }}
              />
              <IconButton onClick={() => setSelectedPhoto(null)}
                sx={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'common.white', '&:hover': { background: 'rgba(0,0,0,0.8)' } }}
              >
                <i className='tabler-x' />
              </IconButton>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
              <div>
                <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'capitalize' }}>
                  {selectedPhoto.category} · {new Date(selectedPhoto.creAt).toLocaleDateString()}
                </Typography>
                {selectedPhoto.caption && (
                  <Typography variant='body2'>{selectedPhoto.caption}</Typography>
                )}
              </div>
              <Button color='error' variant='outlined' size='small' startIcon={<i className='tabler-trash text-sm' />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Delete confirm dialog ── */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth='xs' fullWidth>
        <DialogContent>
          <Typography variant='h6' gutterBottom>Delete this item?</Typography>
          <Typography variant='body2' color='text.secondary'>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button color='error' variant='contained' disabled={deleteMutation.isPending}
            onClick={() => selectedPhoto && deleteMutation.mutate(selectedPhoto.id)}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
