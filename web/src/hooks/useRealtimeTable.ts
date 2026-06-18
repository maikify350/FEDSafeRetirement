'use client'

/**
 * useRealtimeTable
 *
 * Subscribes to Supabase Realtime postgres_changes for a single table.
 * On INSERT  → prepends the new row and flashes it green for 2.5s
 * On DELETE  → removes the row with a brief red flash
 * On UPDATE  → replaces the matching row in place
 *
 * The data array returned is a React state copy managed by this hook.
 * Callers should use `realtimeData` instead of their original `data` for render.
 *
 * @param table      Supabase table name, e.g. 'clients'
 * @param data       The current data array (from your fetch call)
 * @param idField    Primary key field name (default: 'id')
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type FlashState = { id: string; color: 'insert' | 'delete' }

interface UseRealtimeTableOptions<T> {
  table: string
  data: T[]
  idField?: keyof T
  /** Called when a remote INSERT arrives — lets you do a full refetch if the raw row lacks joined fields */
  onInsert?: (raw: T) => Promise<T> | T
}

export function useRealtimeTable<T extends object>({
  table,
  data,
  idField = 'id' as keyof T,
  onInsert,
}: UseRealtimeTableOptions<T>) {
  const [rows, setRows] = useState<T[]>(data)
  const [flashing, setFlashing] = useState<FlashState[]>([])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Keep rows in sync when parent data changes (e.g. initial load / manual refresh)
  useEffect(() => { setRows(data) }, [data])

  const flash = useCallback((id: string, color: FlashState['color'], duration = 2500) => {
    setFlashing(prev => [...prev.filter(f => f.id !== id), { id, color }])
    setTimeout(() => setFlashing(prev => prev.filter(f => f.id !== id)), duration)
  }, [])

  useEffect(() => {
    // Prevent duplicate subscriptions (StrictMode double-mount)
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`rt:${table}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        async (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const raw = payload.new as T
            const resolved = onInsert ? await onInsert(raw) : raw
            setRows(prev => {
              // Avoid duplicate if we already have this id (e.g. own save)
              if (prev.some(r => r[idField] === resolved[idField])) return prev
              return [resolved, ...prev]
            })
            flash(String(resolved[idField]), 'insert')
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as T
            setRows(prev => prev.map(r => r[idField] === updated[idField] ? { ...r, ...updated } : r))
          }

          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as T
            const id = String(deleted[idField])
            flash(id, 'delete')
            // Let the red flash play before removing
            setTimeout(() => {
              setRows(prev => prev.filter(r => String(r[idField]) !== id))
              setFlashing(prev => prev.filter(f => f.id !== id))
            }, 800)
          }
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel); channelRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  return { rows, flashing }
}
