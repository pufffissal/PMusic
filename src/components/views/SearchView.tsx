import { useSettingsStore } from '@/store/settingsStore'
import { SearchViewClassic } from '@/components/views/SearchViewClassic'
import { EnhancedSearchView } from '@/components/views/EnhancedSearchView'

export function SearchView() {
  const enhancedSearch = useSettingsStore((s) => s.settings.enhancedSearch)
  return enhancedSearch ? <EnhancedSearchView /> : <SearchViewClassic />
}
