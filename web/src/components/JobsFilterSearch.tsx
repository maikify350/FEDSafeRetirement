'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Popover from '@mui/material/Popover'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

type JobsFilterSearchProps = {
  searchTerm: string
  onSearchChange: (term: string) => void
  filters: {
    priorities: string[]
    statuses: string[]
    tradeTypes: string[]
  }
  onFiltersChange: (filters: {
    priorities: string[]
    statuses: string[]
    tradeTypes: string[]
  }) => void
  availableFilters: {
    priorities: string[]
    statuses: string[]
    tradeTypes: string[]
  }
}

/**
 * Advanced filter/search panel for the Jobs list with status, priority, and date range filters.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/JobsFilterSearch.tsx
 */
export default function JobsFilterSearch({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  availableFilters
}: JobsFilterSearchProps) {
  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(null)

  const activeFilterCount =
    filters.priorities.length + filters.statuses.length + filters.tradeTypes.length

  const handlePriorityToggle = (priority: string) => {
    if (filters.priorities.length === 0) {
      // Was 'all selected' — uncheck this one means select all except this
      onFiltersChange({ ...filters, priorities: availableFilters.priorities.filter(p => p !== priority) })
    } else if (filters.priorities.includes(priority)) {
      const newPriorities = filters.priorities.filter(p => p !== priority)
      onFiltersChange({ ...filters, priorities: newPriorities })
    } else {
      const newPriorities = [...filters.priorities, priority]
      // If all are now selected, reset to empty (= all)
      onFiltersChange({ ...filters, priorities: newPriorities.length === availableFilters.priorities.length ? [] : newPriorities })
    }
  }

  const handleStatusToggle = (status: string) => {
    if (filters.statuses.length === 0) {
      onFiltersChange({ ...filters, statuses: availableFilters.statuses.filter(s => s !== status) })
    } else if (filters.statuses.includes(status)) {
      const newStatuses = filters.statuses.filter(s => s !== status)
      onFiltersChange({ ...filters, statuses: newStatuses })
    } else {
      const newStatuses = [...filters.statuses, status]
      onFiltersChange({ ...filters, statuses: newStatuses.length === availableFilters.statuses.length ? [] : newStatuses })
    }
  }

  const handleTradeTypeToggle = (tradeType: string) => {
    if (filters.tradeTypes.length === 0) {
      onFiltersChange({ ...filters, tradeTypes: availableFilters.tradeTypes.filter(t => t !== tradeType) })
    } else if (filters.tradeTypes.includes(tradeType)) {
      const newTradeTypes = filters.tradeTypes.filter(t => t !== tradeType)
      onFiltersChange({ ...filters, tradeTypes: newTradeTypes })
    } else {
      const newTradeTypes = [...filters.tradeTypes, tradeType]
      onFiltersChange({ ...filters, tradeTypes: newTradeTypes.length === availableFilters.tradeTypes.length ? [] : newTradeTypes })
    }
  }

  const handleClearAll = () => {
    onFiltersChange({ priorities: [], statuses: [], tradeTypes: [] })
    onSearchChange('')
  }

  return (
    <Box className='flex items-center gap-2 p-2 bg-gray-50 rounded'>
      {/* Search */}
      <TextField
        size='small'
        placeholder='Search jobs...'
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position='start'>
              <i className='tabler-search text-gray-400' />
            </InputAdornment>
          ),
          endAdornment: searchTerm ? (
            <InputAdornment position='end'>
              <IconButton size='small' onClick={() => onSearchChange('')}>
                <i className='tabler-x' />
              </IconButton>
            </InputAdornment>
          ) : null
        }}
        sx={{ flex: 1, minWidth: 200, backgroundColor: 'white' }}
      />

      {/* Filter Button */}
      <Tooltip title='Filter jobs'>
        <IconButton
          size='small'
          onClick={(e) => setFilterAnchor(e.currentTarget)}
          className={activeFilterCount > 0 ? 'text-primary-main' : ''}
        >
          <Box className='relative'>
            <i className='tabler-filter' />
            {activeFilterCount > 0 && (
              <Box
                className='absolute -top-1 -right-1 bg-primary-main text-white rounded-full flex items-center justify-center'
                sx={{ width: 16, height: 16, fontSize: 10 }}
              >
                {activeFilterCount}
              </Box>
            )}
          </Box>
        </IconButton>
      </Tooltip>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <>
          <Box className='flex items-center gap-1 flex-wrap'>
            {filters.priorities.map(p => (
              <Chip
                key={p}
                label={p}
                size='small'
                onDelete={() => handlePriorityToggle(p)}
                color='error'
              />
            ))}
            {filters.statuses.map(s => (
              <Chip
                key={s}
                label={s}
                size='small'
                onDelete={() => handleStatusToggle(s)}
                color='primary'
              />
            ))}
            {filters.tradeTypes.map(t => (
              <Chip
                key={t}
                label={t}
                size='small'
                onDelete={() => handleTradeTypeToggle(t)}
                color='info'
              />
            ))}
          </Box>
          <Tooltip title='Clear all filters'>
            <IconButton size='small' onClick={handleClearAll}>
              <i className='tabler-x' />
            </IconButton>
          </Tooltip>
        </>
      )}

      {/* Filter Popover */}
      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Card sx={{ minWidth: 300, maxWidth: 400, border: '2px solid', borderColor: 'primary.main', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
          <CardContent>
            <Box className='flex items-center justify-between mb-2'>
              <Typography variant='subtitle2' className='font-bold'>
                Filter Jobs
              </Typography>
              <IconButton size='small' onClick={() => setFilterAnchor(null)}>
                <i className='tabler-x' />
              </IconButton>
            </Box>

            {/* Priority Filters */}
            {availableFilters.priorities.length > 0 && (
              <Box className='mb-3'>
                <Typography variant='caption' color='text.secondary' className='block mb-1'>
                  Priority
                </Typography>
                <FormGroup>
                  {availableFilters.priorities.map(priority => (
                    <FormControlLabel
                      key={priority}
                      control={
                        <Checkbox
                          size='small'
                          checked={filters.priorities.length === 0 || filters.priorities.includes(priority)}
                          onChange={() => handlePriorityToggle(priority)}
                        />
                      }
                      label={priority}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}

            {/* Status Filters */}
            {availableFilters.statuses.length > 0 && (
              <Box className='mb-3'>
                <Typography variant='caption' color='text.secondary' className='block mb-1'>
                  Status
                </Typography>
                <FormGroup>
                  {availableFilters.statuses.map(status => (
                    <FormControlLabel
                      key={status}
                      control={
                        <Checkbox
                          size='small'
                          checked={filters.statuses.length === 0 || filters.statuses.includes(status)}
                          onChange={() => handleStatusToggle(status)}
                        />
                      }
                      label={status}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}

            {/* Trade Type Filters */}
            {availableFilters.tradeTypes.length > 0 && (
              <Box>
                <Typography variant='caption' color='text.secondary' className='block mb-1'>
                  Trade Type
                </Typography>
                <FormGroup>
                  {availableFilters.tradeTypes.map(tradeType => (
                    <FormControlLabel
                      key={tradeType}
                      control={
                        <Checkbox
                          size='small'
                          checked={filters.tradeTypes.length === 0 || filters.tradeTypes.includes(tradeType)}
                          onChange={() => handleTradeTypeToggle(tradeType)}
                        />
                      }
                      label={tradeType}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}
          </CardContent>
        </Card>
      </Popover>
    </Box>
  )
}
