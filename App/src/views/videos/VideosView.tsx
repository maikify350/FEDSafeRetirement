'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Dialog from '@mui/material/Dialog'
import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import ConfirmDialog from '@/components/ConfirmDialog'
import { downloadBlob, downloadJson } from '@/utils/exportDownload'
import VideoEditDialog, { type VideoRecord } from './VideoEditDialog'
import VoiceCloneStudioDialog from './VoiceCloneStudioDialog'

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
  const [search, setSearch] = useState('')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editVideo, setEditVideo] = useState<VideoRecord | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)
  const [previewVideoRecord, setPreviewVideoRecord] = useState<VideoRecord | null>(null)
  const [voiceCloneOpen, setVoiceCloneOpen] = useState(false)

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

    if (playingVoiceId === video.id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause()
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setPlayingVoiceId(null)
      return
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause()
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    setPlayingVoiceId(video.id)

    const sampleText = video.script ? video.script.substring(0, 120) : `Hello! This is a preview of the ${video.voice_name || 'Kai'} voice.`

    try {
      const res = await fetch('/api/videos/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: video.voice_id,
          voice_name: video.voice_name,
          speed: video.tempo,
          text: sampleText,
        }),
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        activeAudioRef.current = audio

        audio.onended = () => setPlayingVoiceId(null)
        audio.onerror = () => setPlayingVoiceId(null)
        await audio.play()
        return
      }
    } catch {
      // Fallback
    }

    // Fallback to browser SpeechSynthesis so voice preview always plays
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(sampleText)
        utterance.rate = video.tempo || 1.0
        utterance.onend = () => setPlayingVoiceId(null)
        utterance.onerror = () => setPlayingVoiceId(null)
        window.speechSynthesis.speak(utterance)
        return
      }
    } catch {
      // ignore
    }

    setPlayingVoiceId(null)
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

  const handleCloneVideo = async (video: VideoRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    const clonedTitle = `${video.title || 'Untitled'} (Copy)`
    const payload = {
      ...video,
      title: clonedTitle,
      status: 'draft',
      version_no: 1,
    }
    delete (payload as any).id
    delete (payload as any).cre_dt
    delete (payload as any).mod_dt

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const newVideo = await res.json()
        setVideos(prev => [newVideo, ...prev])
        setEditVideo(newVideo)
      } else {
        const clientClone: VideoRecord = {
          ...video,
          id: `video_${Date.now()}`,
          title: clonedTitle,
          status: 'draft',
          version_no: 1,
          cre_dt: new Date().toISOString(),
        }
        setVideos(prev => [clientClone, ...prev])
        setEditVideo(clientClone)
      }
    } catch {
      const clientClone: VideoRecord = {
        ...video,
        id: `video_${Date.now()}`,
        title: clonedTitle,
        status: 'draft',
        version_no: 1,
        cre_dt: new Date().toISOString(),
      }
      setVideos(prev => [clientClone, ...prev])
      setEditVideo(clientClone)
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
      size: 145,
      enableSorting: false,
      cell: ({ row }: any) => {
        const v = row.original

        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Tooltip title='Watch Video Screen Preview'>
              <IconButton
                size='small'
                color='info'
                onClick={() => {
                  setPreviewVideoRecord(v)
                  setPreviewVideoUrl(v.video_url || '/images/03_Video_Postal_Retirement_Reel.mp4')
                }}
                sx={{
                  bgcolor: 'rgba(0, 186, 255, 0.08)',
                  '&:hover': { bgcolor: 'rgba(0, 186, 255, 0.2)' },
                }}
              >
                <i className='tabler-eye text-[18px]' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Clone / Duplicate Video'>
              <IconButton
                size='small'
                color='secondary'
                onClick={(e) => handleCloneVideo(v, e)}
                sx={{
                  bgcolor: 'rgba(115, 103, 240, 0.08)',
                  '&:hover': { bgcolor: 'rgba(115, 103, 240, 0.2)' },
                }}
              >
                <i className='tabler-copy text-[18px]' />
              </IconButton>
            </Tooltip>
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
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size='small'
              variant='contained'
              color='secondary'
              startIcon={<i className='tabler-microphone' />}
              onClick={() => setVoiceCloneOpen(true)}
              sx={{ fontWeight: 700 }}
            >
              🎙️ Record Mike's Voice
            </Button>
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

      {/* Video Screen Preview Player Large Modal Panel */}
      <Dialog
        open={Boolean(previewVideoUrl)}
        onClose={() => {
          setPreviewVideoUrl(null)
          setPreviewVideoRecord(null)
        }}
        maxWidth='md'
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#090d16',
            color: 'white',
            borderRadius: 2.5,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          }
        }}
      >
        {/* Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          px: 3,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'rgba(15, 23, 42, 0.8)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <i className='tabler-player-play text-[22px] text-primary' />
            <Box>
              <Typography variant='subtitle1' fontWeight={700} sx={{ color: 'white', lineHeight: 1.2 }}>
                {previewVideoRecord?.title || 'Video Screen Preview'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                <Chip
                  label={previewVideoRecord?.format === 'long' ? '16:9 Landscape' : '9:16 Vertical Short'}
                  size='small'
                  color='primary'
                  sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                />
                <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  {previewVideoRecord?.duration_sec}s Duration · Voice: {previewVideoRecord?.voice_name || 'Kai'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <IconButton
            size='small'
            onClick={() => { setPreviewVideoUrl(null); setPreviewVideoRecord(null) }}
            sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
          >
            <i className='tabler-x text-[18px]' />
          </IconButton>
        </Box>

        {/* Video Player Display Container */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2.5,
          bgcolor: '#030712',
          minHeight: 460,
        }}>
          {previewVideoUrl && (
            <video
              src={previewVideoUrl}
              controls
              autoPlay
              style={{
                maxWidth: '100%',
                maxHeight: '68vh',
                borderRadius: 12,
                boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                outline: 'none',
              }}
            />
          )}
        </Box>

        {/* Footer / Script snippet & Action Controls */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          px: 3,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'rgba(15, 23, 42, 0.8)',
          flexWrap: 'wrap',
          gap: 1.5,
        }}>
          <Box sx={{ maxWidth: '65%', minWidth: 260 }}>
            {previewVideoRecord?.cta_text && (
              <Typography variant='caption' display='block' sx={{ color: 'primary.light', fontWeight: 600, mb: 0.25 }}>
                CTA: {previewVideoRecord.cta_text}
              </Typography>
            )}
            {previewVideoRecord?.script && (
              <Typography
                variant='caption'
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                "{previewVideoRecord.script}"
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size='small'
              variant='outlined'
              color='inherit'
              startIcon={<i className='tabler-copy' />}
              onClick={() => previewVideoUrl && navigator.clipboard.writeText(previewVideoUrl)}
              sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            >
              Copy URL
            </Button>
            <Button
              size='small'
              variant='contained'
              color='primary'
              startIcon={<i className='tabler-edit' />}
              onClick={() => {
                const target = previewVideoRecord
                setPreviewVideoUrl(null)
                setPreviewVideoRecord(null)
                if (target) setEditVideo(target)
              }}
            >
              Edit Video
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Voice Clone Studio & Teleprompter Modal */}
      <VoiceCloneStudioDialog
        open={voiceCloneOpen}
        onClose={() => setVoiceCloneOpen(false)}
        onVoiceCloned={() => {
          setVoiceCloneOpen(false)
          fetchVideos()
        }}
      />
    </>
  )
}
