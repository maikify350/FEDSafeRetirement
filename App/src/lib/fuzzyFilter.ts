import { rankItem } from '@tanstack/match-sorter-utils'
import type { FilterFn, Row } from '@tanstack/react-table'

type SearchTextBuilder<T> = (row: Row<T>) => string

export const createColumnValueFuzzyFilter = <T>(): FilterFn<T> => {
  return (row, columnId, value, addMeta) => {
    const itemRank = rankItem(String(row.getValue(columnId) ?? ''), String(value ?? ''))

    addMeta({ itemRank })

    return itemRank.passed
  }
}

export const createMappedFuzzyFilter = <T>(buildSearchText: SearchTextBuilder<T>): FilterFn<T> => {
  return (row, _columnId, value, addMeta) => {
    const itemRank = rankItem(buildSearchText(row), String(value ?? ''))

    addMeta({ itemRank })

    return itemRank.passed
  }
}
