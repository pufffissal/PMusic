import { useState, useCallback } from 'react'

import {

  Play,

  ListPlus,

  ListMusic,

  Heart,

  Info,

  SkipForward,

  Download,

  Trash2,

  EyeOff,

} from 'lucide-react'

import { downloadTrack } from '@/store/downloadStore'

import { usePlaylistDialogStore } from '@/store/playlistDialogStore'

import type { ContextMenuItem } from '@/components/ui/GlassContextMenu'

import type { QueueTrack } from '@/store/playerStore'

import { usePlayerStore } from '@/store/playerStore'

import { useAppStore } from '@/store/appStore'



export type TrackMenuSource = 'recent' | 'similar'



function dispatchLibraryChanged(type: 'history' | 'hidden') {

  window.dispatchEvent(new CustomEvent('pmusic:library-changed', { detail: { type } }))

}



export function useTrackContextMenu() {

  const [menu, setMenu] = useState<{

    x: number

    y: number

    track: QueueTrack

    source?: TrackMenuSource

  } | null>(null)



  const openMenu = useCallback(

    (e: React.MouseEvent, track: QueueTrack, source?: TrackMenuSource) => {

      e.preventDefault()

      e.stopPropagation()

      setMenu({ x: e.clientX, y: e.clientY, track, source })

    },

    [],

  )



  const closeMenu = useCallback(() => setMenu(null), [])



  const playTrack = usePlayerStore((s) => s.playTrack)

  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const addToQueueNext = usePlayerStore((s) => s.addToQueueNext)

  const setNowPlayingOpen = useAppStore((s) => s.setNowPlayingOpen)



  const openAddToPlaylist = usePlaylistDialogStore((s) => s.openAddToPlaylist)



  const getItems = (track: QueueTrack, source?: TrackMenuSource): ContextMenuItem[] => {

    const items: ContextMenuItem[] = [

      { id: 'hdr-playback', label: 'Playback', header: true },

      {

        id: 'play',

        label: 'Play now',

        icon: Play,

        onClick: () => playTrack(track),

      },

      {

        id: 'play-next',

        label: 'Play next',

        icon: SkipForward,

        onClick: () => addToQueueNext(track),

      },

      {

        id: 'queue',

        label: 'Add to queue',

        icon: ListPlus,

        onClick: () => addToQueue(track),

      },

      { id: 'sep1', label: '', separator: true },

      { id: 'hdr-library', label: 'Library', header: true },

      {

        id: 'like',

        label: 'Like song',

        icon: Heart,

        onClick: () => {

          void window.electron?.library.toggleLike({

            id: track.id,

            title: track.title,

            artist: track.artist,

            thumbnail: track.thumbnail,

            likedAt: Date.now(),

          })

        },

      },

      {

        id: 'playlist',

        label: 'Add to playlist…',

        icon: ListMusic,

        onClick: () => openAddToPlaylist(track),

      },

      {

        id: 'download',

        label: 'Download MP3',

        icon: Download,

        onClick: () => {

          void downloadTrack({

            id: track.id,

            title: track.title,

            artist: track.artist,

          })

        },

      },

    ]



    if (source === 'recent') {

      items.push(

        { id: 'sep-manage', label: '', separator: true },

        { id: 'hdr-manage', label: 'Recently played', header: true },

        {

          id: 'remove-recent',

          label: 'Remove from recently played',

          icon: Trash2,

          danger: true,

          onClick: () => {

            void window.electron?.library.removeFromHistory(track.id).then(() => {

              dispatchLibraryChanged('history')

            })

          },

        },

      )

    }



    if (source === 'similar') {

      items.push(

        { id: 'sep-manage', label: '', separator: true },

        { id: 'hdr-manage', label: 'Recommendations', header: true },

        {

          id: 'hide-similar',

          label: 'Hide song',

          icon: EyeOff,

          danger: true,

          onClick: () => {

            void window.electron?.library.hideTrack(track.id).then(() => {

              dispatchLibraryChanged('hidden')

            })

          },

        },

      )

    }



    items.push(

      { id: 'sep2', label: '', separator: true },

      { id: 'hdr-view', label: 'View', header: true },

      {

        id: 'now-playing',

        label: 'Open Now Playing',

        icon: Info,

        onClick: () => {

          playTrack(track)

          setNowPlayingOpen(true)

        },

      },

    )



    return items

  }



  return {

    menu,

    openMenu,

    closeMenu,

    items: menu ? getItems(menu.track, menu.source) : [],

    position: menu ? { x: menu.x, y: menu.y } : { x: 0, y: 0 },

  }

}


