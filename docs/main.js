import { initPatchNotes } from './patch-notes.js'

const REPO = 'pufffissal/PMusic'
const RELEASES_PAGE = `https://github.com/${REPO}/releases`
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=20`

const downloadButtons = [
  document.getElementById('download-btn'),
  document.getElementById('download-btn-footer'),
].filter(Boolean)

const releaseMeta = document.getElementById('release-meta')

function setDownloadLinks(msi) {
  for (const btn of downloadButtons) {
    btn.href = msi.url
    btn.setAttribute('download', msi.name)
    btn.removeAttribute('target')
    btn.removeAttribute('rel')
  }
}

function setFallbackLinks() {
  for (const btn of downloadButtons) {
    const fallback = btn.dataset.fallbackHref || RELEASES_PAGE
    btn.href = fallback
    btn.setAttribute('target', '_blank')
    btn.setAttribute('rel', 'noopener noreferrer')
    btn.removeAttribute('download')
  }
}

function findMsiAsset(assets) {
  if (!Array.isArray(assets)) return null
  return assets.find((asset) => asset.name?.toLowerCase().endsWith('.msi')) ?? null
}

async function resolveLatestMsi() {
  const res = await fetch(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
  })

  if (!res.ok) {
    throw new Error(`GitHub API responded with ${res.status}`)
  }

  const releases = await res.json()
  if (!Array.isArray(releases)) {
    throw new Error('Unexpected GitHub API response')
  }

  for (const release of releases) {
    const msi = findMsiAsset(release.assets)
    if (!msi?.browser_download_url) continue

    return {
      url: msi.browser_download_url,
      name: msi.name,
      version: release.tag_name ?? release.name ?? '',
      size: msi.size,
      prerelease: Boolean(release.prerelease),
    }
  }

  throw new Error('No .msi asset found in recent releases')
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function updateMeta(msi) {
  if (!releaseMeta) return
  const parts = []
  if (msi.version) {
    parts.push(msi.prerelease ? `Pre-release ${msi.version}` : `Release ${msi.version}`)
  }
  const size = formatBytes(msi.size)
  if (size) parts.push(size)
  releaseMeta.textContent = parts.length ? parts.join(' · ') : 'Installer ready'
  releaseMeta.classList.remove('is-error')
}

function updateMetaError() {
  if (!releaseMeta) return
  releaseMeta.textContent = 'Could not fetch installer — open GitHub Releases'
  releaseMeta.classList.add('is-error')
}

function initNav() {
  const toggle = document.getElementById('nav-toggle')
  const nav = document.getElementById('site-nav')
  if (!toggle || !nav) return

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open))
    nav.classList.toggle('is-open', open)
    document.body.classList.toggle('nav-open', open)
  }

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true')
  })

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false))
  })

  window.matchMedia('(min-width: 641px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false)
  })
}

async function init() {
  const year = document.getElementById('year')
  if (year) year.textContent = String(new Date().getFullYear())

  initNav()
  void initPatchNotes()

  try {
    const msi = await resolveLatestMsi()
    setDownloadLinks(msi)
    updateMeta(msi)
    const heroBtn = document.getElementById('download-btn')
    if (heroBtn && msi.version) {
      heroBtn.textContent = `Download ${msi.version}`
    }
  } catch {
    setFallbackLinks()
    updateMetaError()
  }
}

void init()
