const REPO = 'pufffissal/PMusic'
const RELEASES_PAGE = `https://github.com/${REPO}/releases`
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=20`

const downloadButtons = [
  document.getElementById('download-btn'),
  document.getElementById('download-btn-footer'),
].filter(Boolean)

const releaseMeta = document.getElementById('release-meta')
const downloadLabel = document.getElementById('download-label')

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
    headers: {
      Accept: 'application/vnd.github+json',
    },
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
    parts.push(msi.prerelease ? `Latest pre-release: ${msi.version}` : `Latest: ${msi.version}`)
  }
  if (msi.name) parts.push(msi.name)
  const size = formatBytes(msi.size)
  if (size) parts.push(size)
  releaseMeta.textContent = parts.join(' · ')
  releaseMeta.classList.remove('hero__meta--error')
}

function updateMetaError() {
  if (!releaseMeta) return
  releaseMeta.textContent = 'Could not load installer — open releases on GitHub'
  releaseMeta.classList.add('hero__meta--error')
}

function initNav() {
  const toggle = document.getElementById('nav-toggle')
  const nav = document.getElementById('site-nav')
  if (!toggle || !nav) return

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true'
    toggle.setAttribute('aria-expanded', String(!open))
    toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu')
    nav.classList.toggle('is-open', !open)
  })

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false')
      toggle.setAttribute('aria-label', 'Open menu')
      nav.classList.remove('is-open')
    })
  })
}

function initDownloadGuard() {
  for (const btn of downloadButtons) {
    btn.addEventListener('click', (e) => {
      const href = btn.getAttribute('href') || ''
      if (!href.toLowerCase().includes('.msi') && !href.includes('github.com')) {
        e.preventDefault()
        window.open(RELEASES_PAGE, '_blank', 'noopener,noreferrer')
      }
    })
  }
}

async function init() {
  const year = document.getElementById('year')
  if (year) year.textContent = String(new Date().getFullYear())

  initNav()
  initDownloadGuard()

  try {
    const msi = await resolveLatestMsi()
    setDownloadLinks(msi)
    updateMeta(msi)
    if (downloadLabel) {
      downloadLabel.textContent = msi.version
        ? `Download ${msi.version} for Windows`
        : 'Download for Windows'
    }
  } catch {
    setFallbackLinks()
    updateMetaError()
  }
}

void init()
