'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardMedia from '@mui/material/CardMedia'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Divider from '@mui/material/Divider'

import { OFFICIAL_BRAND_LOGOS } from '@/data/defaultBrandAssets'

interface GalleryAsset {
  id: string
  name: string
  size: number
  mimetype: string
  created_at: string
  bucket: string
  publicUrl: string
  type: 'image' | 'video'
}

export default function GalleryView() {
  const [items, setItems] = useState<GalleryAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [bucket, setBucket] = useState<'gallery' | 'videos'>('gallery')
  const [search, setSearch] = useState('')
  const [previewAsset, setPreviewAsset] = useState<GalleryAsset | null>(null)
  const [uploading, setUploading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/gallery?bucket=${bucket}`)
      const data = await res.json()
      if (Array.isArray(data)) setItems(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [bucket])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)

      const res = await fetch('/api/gallery', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        await fetchItems()
      }
    } catch {
      // ignore
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (item: GalleryAsset) => {
    try {
      const res = await fetch(`/api/gallery?bucket=${item.bucket}&name=${encodeURIComponent(item.name)}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setItems(prev => prev.filter(i => i.name !== item.name))
        if (previewAsset?.name === item.name) setPreviewAsset(null)
      }
    } catch {
      // ignore
    }
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header & Actions */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box>
          <Typography variant='h5' fontWeight={700}>
            Media Gallery & Brand Assets
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Centralized repository for official FedSafe brand logos, reference images, B-roll clips, and video outputs.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <input
            type='file'
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept='image/*,video/*'
            onChange={handleFileUpload}
          />
          <Button
            variant='contained'
            startIcon={uploading ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-upload' />}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload Asset'}
          </Button>
        </Box>
      </Box>

      {/* Official Brand Logos - Pinned & Protected Section */}
      <Alert
        severity='info'
        icon={<i className='tabler-shield-check text-[22px]' />}
        sx={{
          borderRadius: 2,
          bgcolor: 'action.hover',
          border: '1px solid',
          borderColor: 'primary.main',
        }}
      >
        <AlertTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          Official Brand Identity Logos (Transparent · Minimum Borders · Zero White Box)
        </AlertTitle>
        <Typography variant='body2' sx={{ mb: 1.5 }}>
          <strong>MANDATORY CREATIVE POLICY (Mike Zaino Rule):</strong> All brand logos below are rendered with <strong>pure alpha transparency and cropped to minimum borders</strong> so no white box appears when placed over dark mode, video footage, or colored backgrounds. <strong>Do NOT alter colors or design. Scale sizes proportionally only.</strong>
        </Typography>

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {OFFICIAL_BRAND_LOGOS.map(logo => (
            <Grid item xs={12} sm={6} md={6} lg={3} key={logo.id}>
              <Card sx={{
                display: 'flex',
                flexDirection: 'column',
                p: 1.5,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                height: '100%',
                justifyContent: 'space-between',
              }}>
                <Box>
                  {/* Checkered Transparency Box */}
                  <Box sx={{
                    height: 110,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 1,
                    mb: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundImage: 'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    backgroundColor: '#0f172a',
                  }}>
                    <img
                      src={logo.publicUrl}
                      alt={logo.label}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant='subtitle2' fontWeight={700} noWrap title={logo.name}>
                      {logo.label}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                    <Chip label='100% Transparent' size='small' color='success' variant='outlined' sx={{ height: 18, fontSize: 9, fontWeight: 700 }} />
                    <Chip label={logo.dimensions} size='small' variant='outlined' sx={{ height: 18, fontSize: 9 }} />
                  </Box>

                  <Typography variant='caption' color='text.secondary' display='block' sx={{ fontSize: 11, mb: 1.5 }}>
                    {logo.description}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                  <Button
                    size='small'
                    variant='outlined'
                    fullWidth
                    startIcon={<i className={copiedUrl === logo.publicUrl ? 'tabler-check' : 'tabler-copy'} />}
                    onClick={() => handleCopyUrl(logo.publicUrl)}
                    sx={{ fontSize: 11, py: 0.25 }}
                  >
                    {copiedUrl === logo.publicUrl ? 'Copied!' : 'Copy Path'}
                  </Button>
                  <Button
                    size='small'
                    variant='text'
                    component='a'
                    href={logo.publicUrl}
                    target='_blank'
                    download
                    startIcon={<i className='tabler-download' />}
                    sx={{ fontSize: 11, py: 0.25 }}
                  >
                    PNG
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Alert>

      {/* Filter Tabs & Search */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Tabs
          value={bucket}
          onChange={(_, val) => setBucket(val)}
          sx={{ minHeight: 44 }}
        >
          <Tab value='gallery' label='Gallery Bucket' icon={<i className='tabler-photo' />} iconPosition='start' />
          <Tab value='videos' label='Videos Bucket' icon={<i className='tabler-video' />} iconPosition='start' />
        </Tabs>

        <TextField
          size='small'
          placeholder='Search files…'
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 260 }, mb: 1 }}
          InputProps={{
            startAdornment: <i className='tabler-search text-textSecondary mr-2' />,
          }}
        />
      </Box>

      {/* Asset Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <CircularProgress />
        </Box>
      ) : filteredItems.length === 0 ? (
        <Box sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}>
          <i className='tabler-folder-off text-[48px] text-textSecondary mb-2' />
          <Typography variant='h6' color='text.secondary'>
            No items in "{bucket}" bucket
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, mb: 2 }}>
            Upload reference images, logos, or video clips to make them available across the app.
          </Typography>
          <Button
            variant='contained'
            startIcon={<i className='tabler-upload' />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Now
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filteredItems.map(item => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Card sx={{
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                },
              }}>
                {/* Media Preview Box */}
                <Box
                  sx={{
                    height: 160,
                    bgcolor: 'black',
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => setPreviewAsset(item)}
                >
                  {item.type === 'video' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <i className='tabler-video text-white text-[36px]' />
                      <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Click to play video
                      </Typography>
                    </Box>
                  ) : (
                    <CardMedia
                      component='img'
                      height='160'
                      image={item.publicUrl}
                      alt={item.name}
                      sx={{ height: 160, objectFit: 'contain', bgcolor: '#0f172a' }}
                    />
                  )}

                  <Chip
                    label={item.type.toUpperCase()}
                    size='small'
                    color={item.type === 'video' ? 'info' : 'primary'}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      height: 20,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                </Box>

                {/* Card Content & Details */}
                <CardContent sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant='subtitle2' fontWeight={600} noWrap title={item.name}>
                      {item.name}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' display='block'>
                      {formatFileSize(item.size)} · {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                    <Tooltip title={copiedUrl === item.publicUrl ? 'Copied!' : 'Copy Public URL'}>
                      <IconButton size='small' onClick={() => handleCopyUrl(item.publicUrl)} color={copiedUrl === item.publicUrl ? 'success' : 'default'}>
                        <i className={copiedUrl === item.publicUrl ? 'tabler-check' : 'tabler-copy'} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title='Delete Asset'>
                      <IconButton size='small' color='error' onClick={() => handleDelete(item)}>
                        <i className='tabler-trash' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Asset Preview Modal */}
      <Dialog
        open={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{previewAsset?.name}</span>
          <IconButton size='small' onClick={() => setPreviewAsset(null)}>
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, display: 'flex', justifyContent: 'center', bgcolor: '#090d16' }}>
          {previewAsset?.type === 'video' ? (
            <video
              src={previewAsset.publicUrl}
              controls
              autoPlay
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }}
            />
          ) : (
            <img
              src={previewAsset?.publicUrl}
              alt={previewAsset?.name}
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Typography variant='caption' color='text.secondary'>
            {formatFileSize(previewAsset?.size || 0)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              startIcon={<i className='tabler-copy' />}
              onClick={() => previewAsset && handleCopyUrl(previewAsset.publicUrl)}
            >
              Copy URL
            </Button>
            <Button
              variant='contained'
              component='a'
              href={previewAsset?.publicUrl}
              target='_blank'
              download
            >
              Download
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
