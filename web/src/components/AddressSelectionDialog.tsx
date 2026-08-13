'use client'

import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Radio from '@mui/material/Radio'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

interface ClientAddress {
  id: string
  street?: string
  street2?: string
  city?: string
  state?: string
  stateId?: string
  zipCode?: string
  addressType?: string
}

interface AddressSelectionDialogProps {
  open: boolean
  onClose: () => void
  addresses: ClientAddress[]
  onSelect: (addressId: string | null, addressData: ClientAddress | null) => void
}

/**
 * Dialog for selecting a client address from a dropdown or entering a new one.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/AddressSelectionDialog.tsx
 */
export default function AddressSelectionDialog({
  open,
  onClose,
  addresses,
  onSelect
}: AddressSelectionDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleConfirm = () => {
    if (selectedId === 'blank') {
      onSelect(null, null)
    } else if (selectedId) {
      const addr = addresses.find(a => a.id === selectedId)
      if (addr) {
        onSelect(addr.id, addr)
      }
    }
    onClose()
  }

  const formatAddress = (addr: ClientAddress) => {
    const parts = []
    if (addr.street) parts.push(addr.street)
    if (addr.city) parts.push(addr.city)
    if (addr.state) parts.push(addr.state)
    if (addr.zipCode) parts.push(addr.zipCode)
    return parts.join(', ') || 'Incomplete address'
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Property Address</DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        <List>
          {/* Blank option */}
          <ListItem disablePadding>
            <ListItemButton onClick={() => setSelectedId('blank')} selected={selectedId === 'blank'}>
              <Radio checked={selectedId === 'blank'} edge="start" />
              <ListItemText
                primary={<Typography sx={{ fontStyle: 'italic', color: 'text.secondary' }}>&lt;Blank&gt;</Typography>}
                secondary="Leave address fields empty"
              />
            </ListItemButton>
          </ListItem>

          <Divider />

          {/* Client addresses */}
          {addresses.length === 0 ? (
            <ListItem>
              <ListItemText
                primary={<Typography sx={{ fontStyle: 'italic', color: 'text.secondary' }}>No saved addresses</Typography>}
                secondary="Client has no saved addresses yet"
              />
            </ListItem>
          ) : (
            addresses.map((addr) => (
              <ListItem key={addr.id} disablePadding>
                <ListItemButton onClick={() => setSelectedId(addr.id)} selected={selectedId === addr.id}>
                  <Radio checked={selectedId === addr.id} edge="start" />
                  <ListItemText
                    primary={formatAddress(addr)}
                    secondary={addr.addressType ? `Type: ${addr.addressType}` : undefined}
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!selectedId}>
          Use Selected Address
        </Button>
      </DialogActions>
    </Dialog>
  )
}
