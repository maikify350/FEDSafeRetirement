'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import ConfirmDialog from '@/components/ConfirmDialog'
import { downloadBlob, downloadJson } from '@/utils/exportDownload'
import VideoEditDialog, { type VideoRecord } from './VideoEditDialog'

const columnHelper = createColumnHelper<VideoRecord>()

const formatDate = (v: string | null) => {
  if (!v) return '—'

  return new Date(v).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

import { DEFAULT_PREGENERATED_VIDEOS } from '@/data/defaultVideos'

export default function VideosView() {
  const [videos, setVideos] = useState<VideoRecord[]>(DEFAULT_PREGENERATED_VIDEOS)
  const [loading, setLoading] = useState(false)

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)

  // Audio preview playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<VideoRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/videos')
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setVideos(data)
      } else {
        setVideos(DEFAULT_PREGENERATED_VIDEOS)
      }
    } catch {
      setVideos(DEFAULT_PREGENERATED_VIDEOS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  // Play voice sample
  const handlePlayVoice = async (video: VideoRecord, e: React.MouseEvent) => {
    e.stopPropagation()

    if (playingVoiceId === video.id && activeAudioRef.current) {
      activeAudioRef.current.pause()
      setPlayingVoiceId(null)
      return
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause()
    }

    setPlayingVoiceId(video.id)

    try {
      const res = await fetch('/api/videos/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: video.voice_id,
          voice_name: video.voice_name,
          speed: video.tempo,
          text: video.script ? video.script.substring(0, 120) : undefined,
        }),
      })

      if (!res.ok) throw new Error('Preview failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      activeAudioRef.current = audio

      audio.onended = () => setPlayingVoiceId(null)
      audio.onerror = () => setPlayingVoiceId(null)
      await audio.play()
    } catch {
      setPlayingVoiceId(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/videos/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setVideos(prev => prev.filter(v => v.id !== deleteTarget.id))
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const columns = useMemo(() => [
    columnHelper.accessor('title', {
      header: 'Video & Thumbnail',
      size: 280,
      cell: ({ row }) => {
        const v = row.original

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              onClick={(e) => {
                if (v.video_url) {
                  e.stopPropagation()
                  setPreviewVideoUrl(v.video_url)
                }
              }}
              sx={{
                position: 'relative',
                cursor: v.video_url ? 'pointer' : 'default',
                width: 44,
                height: v.format === 'short' ? 58 : 36,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover .play-overlay': {
                  opacity: 1,
                },
              }}
            >
              {v.thumbnail_url ? (
                <Box
                  component='img'
                  src={v.thumbnail_url}
                  alt={v.title}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <i className='tabler-video text-textSecondary text-[20px]' />
              )}
              {v.video_url && (
                <Box
                  className='play-overlay'
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.7,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <i className='tabler-player-play text-white text-[16px]' />
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
              <Typography className='text-sm font-semibold' color='text.primary' noWrap title={v.title}>
                {v.title || 'Untitled Video'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  label={v.format === 'long' ? '16:9 Long' : '9:16 Short'}
                  size='small'
                  color={v.format === 'long' ? 'info' : 'primary'}
                  variant='tonal'
                  sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                />
                <Typography variant='caption' color='text.secondary'>
                  {v.duration_sec}s
                </Typography>
                {v.tempo !== 1 && (
                  <Chip
                    label={`${Number(v.tempo).toFixed(1)}×`}
                    size='small'
                    variant='outlined'
                    sx={{ height: 18, fontSize: 10 }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        )
      },
    }),
    columnHelper.accessor('voice_name', {
      header: 'Voice (ElevenLabs)',
      size: 190,
      cell: ({ row }) => {
        const v = row.original
        const isPlaying = playingVoiceId === v.id

        const femaleVoices = ['Aurora', 'Shanni', 'Carolyn', 'Cassidy', 'Jessica', 'Nova', 'Shimmer']
        const isFemale = femaleVoices.includes(v.voice_name)

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography className='text-sm font-medium'>
                  {v.voice_name || 'Kai'}
                </Typography>
                <Chip
                  label={isFemale ? 'F' : 'M'}
                  size='small'
                  variant='tonal'
                  color={isFemale ? 'secondary' : 'info'}
                  sx={{ height: 16, fontSize: 9, fontWeight: 700, minWidth: 16, px: 0.25 }}
                />
              </Box>
              <Typography variant='caption' color='text.disabled' sx={{ fontSize: 10 }}>
                {v.voice_id?.substring(0, 8)}…
              </Typography>
            </Box>

            <Tooltip title={isPlaying ? 'Pause sample' : 'Listen to voice sample'}>
              <IconButton
                size='small'
                color={isPlaying ? 'primary' : 'default'}
                onClick={(e) => handlePlayVoice(v, e)}
                sx={{
                  bgcolor: isPlaying ? 'primary.lighter' : isFemale ? 'rgba(236,72,153,0.1)' : 'rgba(59,130,246,0.1)',
                  '&:hover': { bgcolor: isFemale ? 'rgba(236,72,153,0.2)' : 'rgba(59,130,246,0.2)' },
                  p: 0.5,
                }}
              >
                <i className={isPlaying ? 'tabler-player-pause text-[16px]' : 'tabler-player-play text-[16px]'} />
              </IconButton>
            </Tooltip>
          </Box>
        )
      },
    }),
    columnHelper.accessor('script', {
      header: 'Narration Script',
      size: 240,
      cell: ({ row }) => {
        const scriptText = row.original.script || ''
        const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.3,
              }}
            >
              {scriptText || <span style={{ fontStyle: 'italic', color: '#999' }}>No script set</span>}
            </Typography>
            {wordCount > 0 && (
              <Typography variant='caption' color='text.disabled' sx={{ fontSize: 10, mt: 0.25 }}>
                {wordCount} words
              </Typography>
            )}
          </Box>
        )
      },
    }),
    columnHelper.accessor('cta_text', {
      header: 'Call To Action (CTA)',
      size: 200,
      cell: ({ row }) => {
        const v = row.original

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant='caption' noWrap title={v.cta_text}>
              {v.cta_text || '—'}
            </Typography>
            {v.cta_text && (
              <Chip
                label={v.cta_on_every_frame ? 'Visible Throughout' : 'End Frame'}
                size='small'
                color={v.cta_on_every_frame ? 'secondary' : 'default'}
                variant='outlined'
                sx={{ height: 18, fontSize: 10, width: 'fit-content' }}
              />
            )}
          </Box>
        )
      },
    }),
    columnHelper.accessor('media_assets', {
      header: 'Assets & Sequence',
      size: 150,
      cell: ({ row }) => {
        const assets = row.original.media_assets || []

        if (assets.length === 0) {
          return <Typography variant='caption' color='text.disabled'>No assets</Typography>
        }

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 26, height: 26, fontSize: 11 } }}>
              {assets.map((a, i) => (
                <Avatar key={i} src={a.url} alt={a.name}>
                  {a.type === 'video' ? '▶' : '🖼'}
                </Avatar>
              ))}
            </AvatarGroup>
            <Typography variant='caption' fontWeight={600} color='text.secondary'>
              ({assets.length})
            </Typography>
          </Box>
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 110,
      cell: ({ row }) => {
        const s = row.original.status || 'draft'
        const colorMap: Record<string, 'default' | 'info' | 'success' | 'error'> = {
          draft: 'default',
          generating: 'info',
          ready: 'success',
          failed: 'error',
        }

        return (
          <Chip
            label={s.toUpperCase()}
            size='small'
            color={colorMap[s] || 'default'}
            sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
          />
        )
      },
    }),
    columnHelper.accessor('cre_dt', {
      header: 'Created',
      size: 150,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant='caption'>{formatDate(row.original.cre_dt)}</Typography>
          <Typography variant='caption' color='text.disabled' sx={{ fontSize: 10 }}>
            {row.original.cre_by || 'System'}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.accessor('mod_dt', {
      header: 'Modified',
      size: 150,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant='caption'>{formatDate(row.original.mod_dt)}</Typography>
          <Typography variant='caption' color='text.disabled' sx={{ fontSize: 10 }}>
            {row.original.mod_by || '—'}
          </Typography>
        </Box>
      ),
    }),
    {
      id: 'actions',
      header: 'Actions',
      size: 90,
      enableSorting: false,
      cell: ({ row }: any) => {
        const v = row.original

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title='Edit Video'>
              <IconButton size='small' color='primary' onClick={() => setEditVideo(v)}>
                <i className='tabler-edit text-[18px]' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Delete Video'>
              <IconButton size='small' color='error' onClick={() => setDeleteTarget(v)}>
                <i className='tabler-trash text-[18px]' />
              </IconButton>
            </Tooltip>
          </Box>
        )
      },
    },
  ], [playingVoiceId])

  const defaultColVisibility = {
    mod_dt: false,
    mod_by: false,
  }

  const handleSaved = (saved: VideoRecord) => {
    setVideos(prev => {
      const idx = prev.findIndex(v => v.id === saved.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = saved

        return copy
      }

      return [saved, ...prev]
    })
  }

  if (loading && videos.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <EntityListView<VideoRecord>
        columns={columns as any}
        data={videos}
        storageKey='fs-videos-grid'
        defaultColVisibility={defaultColVisibility}
        title='Video Production & Assets'
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search videos by title, script, directive...'
        toolbarActions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size='small'
              variant='outlined'
              color='secondary'
              startIcon={<i className='tabler-book' />}
              href='https://docs.google.com/document/d/1sKs7udDUjNi-W1YudE5PY9nlWEvfC9447nDU0VAT4fo/edit'
              target='_blank'
              rel='noopener noreferrer'
            >
              Brand Bible (Google Doc)
            </Button>
            <Button
              size='small'
              variant='outlined'
              color='primary'
              startIcon={<i className='tabler-brand-google-drive' />}
              href='https://drive.google.com/drive/folders/1BrTO9rFFgLbLJQI1NhXWtblQ8EcA2Cis'
              target='_blank'
              rel='noopener noreferrer'
            >
              Drive Folder
            </Button>
          </Box>
        }
        newButtonLabel='+ Create Video'
        onNewClick={() => setCreateOpen(true)}
        onExportCsv={(rows) => {
          const csv = ['ID,Title,Format,DurationSec,Voice,Tempo,Status,CTA,CreatedBy,CreatedDate'].concat(
            rows.map(r => `"${r.id}","${r.title.replace(/"/g, '""')}","${r.format}",${r.duration_sec},"${r.voice_name}",${r.tempo},"${r.status}","${r.cta_text.replace(/"/g, '""')}","${r.cre_by}","${r.cre_dt}"`)
          ).join('\n')

          downloadBlob(csv, 'fedsafe_videos.csv', 'text/csv')
        }}
        onExportJson={(rows) => downloadJson(rows, 'fedsafe_videos.json')}
        emptyMessage='No videos created yet. Click "+ Create Video" to configure your first video script and voice narration.'
        onRowDoubleClick={(row) => setEditVideo(row)}
      />

      {/* Create / Edit Dialog */}
      <VideoEditDialog
        open={createOpen || Boolean(editVideo)}
        onClose={() => {
          setCreateOpen(false)
          setEditVideo(null)
        }}
        video={editVideo}
        onSaved={handleSaved}
      />

      {/* Confirmation Dialog for Soft Deletion */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Video'
        message={`Are you sure you want to delete "${deleteTarget?.title || 'this video'}"? This action can be undone by an administrator.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmColor='error'
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Video Preview Player Dialog */}
      <Dialog
        open={Boolean(previewVideoUrl)}
        onClose={() => setPreviewVideoUrl(null)}
        maxWidth='xs'
        fullWidth
        PaperProps={{ sx: { bgcolor: 'black', borderRadius: 2, overflow: 'hidden' } }}
      >
        <Box sx={{ position: 'relative', width: '100%', bgcolor: 'black', display: 'flex', flexDirection: 'column' }}>
          <IconButton
            size='small'
            onClick={() => setPreviewVideoUrl(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'white', bgcolor: 'rgba(0,0,0,0.6)', zIndex: 10 }}
          >
            <i className='tabler-x text-[16px]' />
          </IconButton>
          {previewVideoUrl && (
            <video
              src={previewVideoUrl}
              controls
              autoPlay
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </Box>
      </Dialog>
    </>
  )
}
