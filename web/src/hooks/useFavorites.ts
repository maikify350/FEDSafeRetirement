import { useCallback } from 'react'
import useLocalStorage from './useLocalStorage'

/**
 * Persists a set of favorited entity IDs in localStorage.
 * Reusable for any entity: clients, jobs, quotes, etc.
 *
 * @param storageKey - e.g. 'jm-clients-favorites'
 *
 * @example
 * const { isFavorite, toggleFavorite, favoriteIds } = useFavorites('jm-clients-favorites')
 */
function useFavorites(storageKey: string) {
  const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>(storageKey, [])

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds]
  )

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavoriteIds(prev =>
        prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
      )
    },
    [setFavoriteIds]
  )

  return { isFavorite, toggleFavorite, favoriteIds, setFavoriteIds }
}

export default useFavorites
