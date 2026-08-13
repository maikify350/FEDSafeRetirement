'use client'

import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Box from '@mui/material/Box'

import { MENU_ENTRIES, useMenuVisibility, type MenuEntryId } from '@/hooks/useMenuVisibility'

interface MenuVisibilityDrawerProps {
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Settings drawer for toggling menu item visibility in the navigation sidebar.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/MenuVisibilityDrawer.tsx
 */
export default function MenuVisibilityDrawer({ open, onClose }: MenuVisibilityDrawerProps) {
  const { visibility, toggle, showAll, hiddenCount } = useMenuVisibility()

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: 320,
            bgcolor: 'background.paper',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='tabler-layout-sidebar text-xl' style={{ color: 'var(--mui-palette-primary-main)' }} />
          <Typography variant='h6' fontWeight={700}>
            Sidebar Menus
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose}>
          <i className='tabler-x text-lg' />
        </IconButton>
      </Box>

      {/* Description + Show All */}
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
          Choose which menu items appear in the sidebar. Your choices are saved per account.
        </Typography>
        {hiddenCount > 0 && (
          <Button
            size='small'
            variant='outlined'
            onClick={showAll}
            startIcon={<i className='tabler-eye text-sm' />}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
          >
            Show All ({hiddenCount} hidden)
          </Button>
        )}
      </Box>

      <Divider />

      {/* Menu checkboxes */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }}>
        {MENU_ENTRIES.map(entry => {
          const checked = visibility[entry.id] ?? true

          return (
            <FormControlLabel
              key={entry.id}
              sx={{
                display: 'flex',
                mx: 0,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                transition: 'background 0.15s',
                '&:hover': { bgcolor: 'action.hover' },
                opacity: checked ? 1 : 0.5,
              }}
              control={
                <Checkbox
                  size='small'
                  checked={checked}
                  onChange={() => toggle(entry.id as MenuEntryId)}
                  sx={{ mr: 1 }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <i
                    className={`${entry.icon} text-lg`}
                    style={{
                      color: checked
                        ? 'var(--mui-palette-primary-main)'
                        : 'var(--mui-palette-text-disabled)',
                    }}
                  />
                  <Typography
                    variant='body2'
                    fontWeight={checked ? 500 : 400}
                    color={checked ? 'text.primary' : 'text.disabled'}
                  >
                    {entry.label}
                  </Typography>
                </Box>
              }
            />
          )
        })}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <i className='tabler-info-circle text-sm' style={{ color: 'var(--mui-palette-text-disabled)' }} />
        <Typography variant='caption' color='text.secondary'>
          Changes apply instantly and persist between sessions.
        </Typography>
      </Box>
    </Drawer>
  )
}
