'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import { api } from '@/lib/api'
import { getThumbUrl } from '@/lib/imageUtils'

interface Photo {
  id: string
  url: string
  caption?: string
  category?: string
  mediaType?: string
  creAt?: string
}

interface PhotosResponse {
  photos: Photo[]
  total: number
}

interface PhotoGallerySectionProps {
  entityId: string
  entityType: 'client' | 'job' | 'quote' | 'request' | 'invoice' | 'vendor' | 'solution' | 'purchaseOrder' | 'vehicle'
}

/**
 * Photo upload and gallery grid section for any entity.
 * Supports file upload, thumbnail grid with lazy loading, full-size
 * preview dialog, and per-photo delete with confirmation.
 *
 * @module components/PhotoGallerySection
 */
export default function PhotoGallerySection({ entityId, entityType }: PhotoGallerySectionProps) {
  const queryClient = useQueryClient()
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { data: photosData, isLoading } = useQuery({
    queryKey: ['photos', entityType, entityId],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set(`${entityType}Id`, entityId)
      return api.get<PhotosResponse>(`/api/photos?${params.toString()}`)
    },
    enabled: !!entityId
  })

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => api.delete(`/api/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', entityType, entityId] })
      setSelectedPhoto(null)
    }
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      // Step 1: Upload file to get URL
      const formData = new FormData()
      formData.append('file', files[0])

      const uploadResult = await api.post<{ url: string; filename: string }>('/api/upload/file', formData)

      if (!uploadResult.url) {
        throw new Error('No URL returned from upload')
      }

      // Step 2: Create photo record with URL and entity association
      const photoData: any = {
        url: uploadResult.url,
        filename: uploadResult.filename,
        category: entityType,
      }

      // Add entity ID field based on entity type
      photoData[`${entityType}Id`] = entityId

      await api.post('/api/photos', photoData)

      queryClient.invalidateQueries({ queryKey: ['photos', entityType, entityId] })
    } catch (error) {
      console.error('Failed to upload photo:', error)
      alert('Failed to upload photo')
    } finally {
      setIsUploading(false)
      e.target.value = '' // Reset input
    }
  }

  const photos = photosData?.photos || []

  if (isLoading) {
    return (
      <Box className='flex justify-center p-8'>
        <CircularProgress size={24} />
      </Box>
    )
  }

  return (
    <Box className='mb-6'>
      <Box className='flex items-center justify-between mb-3'>
        <Typography variant='overline' color='text.secondary'>
          Photos ({photos.length})
        </Typography>
        <Button
          variant='outlined'
          size='small'
          component='label'
          disabled={isUploading}
          startIcon={isUploading ? <CircularProgress size={16} /> : <i className='tabler-upload' />}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
          <input type='file' accept='image/*' hidden onChange={handleFileUpload} />
        </Button>
      </Box>

      {photos.length === 0 ? (
        <Box
          className='p-8 rounded-lg text-center'
          sx={{ bgcolor: 'background.default', border: 1, borderColor: 'divider' }}
        >
          <i className='tabler-photo text-4xl' style={{ opacity: 0.3 }} />
          <Typography variant='body2' color='text.secondary' className='mt-2'>
            No photos yet. Upload your first photo!
          </Typography>
        </Box>
      ) : (
        <Box className='grid grid-cols-3 gap-2'>
          {photos.map((photo) => (
            <Box
              key={photo.id}
              className='relative aspect-square rounded-lg overflow-hidden cursor-pointer'
              sx={{
                bgcolor: 'background.default',
                border: 1,
                borderColor: 'divider',
                '&:hover .delete-btn': { opacity: 1 }
              }}
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={getThumbUrl(photo.url, { width: 200, height: 200 })}
                alt={photo.caption || 'Photo'}
                className='w-full h-full object-cover'
                loading='lazy'
              />
              <IconButton
                className='delete-btn'
                size='small'
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Delete this photo?')) {
                    deleteMutation.mutate(photo.id)
                  }
                }}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
              >
                <i className='tabler-trash text-sm' />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Photo Viewer Dialog */}
      <Dialog
        open={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        maxWidth='lg'
        fullWidth
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setSelectedPhoto(null)}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, bgcolor: 'rgba(0,0,0,0.6)', color: 'white' }}
          >
            <i className='tabler-x' />
          </IconButton>
          {selectedPhoto && (
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || 'Photo'}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
