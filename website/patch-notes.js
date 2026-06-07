const DATA_URL = 'patch-notes.json'

function parseDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function compareVersions(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

function chronological(releases) {
  return [...releases].sort((a, b) => compareVersions(a.version, b.version))
}

function newestFirst(releases) {
  return chronological(releases).reverse()
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

function buildMindmap(releases, onSelect) {
  const latest = newestFirst(releases)[0]?.version
  const wrap = el('div', 'patch-mindmap')

  const root = el('button', 'patch-mindmap__root')
  root.type = 'button'
  root.dataset.version = ''
  root.innerHTML =
    '<span class="patch-mindmap__root-name">PMusic</span>' +
    (latest ? `<span class="patch-mindmap__root-badge">v${latest}</span>` : '')
  root.addEventListener('click', () => onSelect(null))

  const tree = el('ol', 'patch-mindmap__tree')
  tree.setAttribute('aria-label', 'Release map')

  for (const release of newestFirst(releases)) {
    const item = el('li', 'patch-mindmap__item')
    item.dataset.version = release.version

    const verBtn = el('button', 'patch-mindmap__ver')
    verBtn.type = 'button'
    verBtn.dataset.version = release.version
    verBtn.textContent = `v${release.version}`
    verBtn.addEventListener('click', () => onSelect(release.version))

    const meta = el('div', 'patch-mindmap__meta')
    meta.appendChild(verBtn)
    meta.appendChild(el('time', 'patch-mindmap__date', parseDate(release.date)))

    const topics = el('ul', 'patch-mindmap__topics')
    for (const branch of release.branches) {
      const li = el('li', null)
      const topicBtn = el('button', 'patch-mindmap__topic')
      topicBtn.type = 'button'
      topicBtn.dataset.version = release.version
      topicBtn.dataset.topic = branch.topic
      topicBtn.textContent = branch.topic
      topicBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelect(release.version, branch.topic)
      })
      li.appendChild(topicBtn)
      topics.appendChild(li)
    }

    item.appendChild(meta)
    item.appendChild(topics)
    tree.appendChild(item)
  }

  wrap.appendChild(root)
  wrap.appendChild(tree)

  return {
    wrap,
    setActive(version, topic) {
      wrap.querySelectorAll('.patch-mindmap__root, .patch-mindmap__ver, .patch-mindmap__topic').forEach((n) => {
        n.classList.remove('is-active')
      })
      wrap.querySelectorAll('.patch-mindmap__item').forEach((n) => {
        n.classList.remove('is-active', 'is-topic-active')
      })

      if (!version) {
        root.classList.add('is-active')
        return
      }

      const item = wrap.querySelector(`.patch-mindmap__item[data-version="${version}"]`)
      item?.classList.add('is-active')
      wrap.querySelector(`.patch-mindmap__ver[data-version="${version}"]`)?.classList.add('is-active')

      if (topic) {
        item?.classList.add('is-topic-active')
        wrap
          .querySelector(`.patch-mindmap__topic[data-version="${version}"][data-topic="${topic}"]`)
          ?.classList.add('is-active')
      }
    },
  }
}

function buildTimeline(releases, onSelect) {
  const list = el('ol', 'patch-timeline')
  list.setAttribute('aria-label', 'Release history')

  for (const release of newestFirst(releases)) {
    const item = el('li', 'patch-timeline__item')
    item.id = `release-${release.version.replace(/\./g, '-')}`
    item.dataset.version = release.version

    const head = el('header', 'patch-timeline__head')
    const verBtn = el('button', 'patch-timeline__ver')
    verBtn.type = 'button'
    verBtn.textContent = `v${release.version}`
    verBtn.addEventListener('click', () => onSelect(release.version))

    head.appendChild(verBtn)
    head.appendChild(el('time', 'patch-timeline__date', parseDate(release.date)))
    head.appendChild(el('h3', 'patch-timeline__title', release.title))

    const body = el('div', 'patch-timeline__body')
    for (const branch of release.branches) {
      const group = el('article', 'patch-timeline__group')
      group.dataset.topic = branch.topic
      group.appendChild(el('h4', null, branch.topic))
      const ul = el('ul', null)
      for (const line of branch.items) {
        ul.appendChild(el('li', null, line))
      }
      group.appendChild(ul)
      body.appendChild(group)
    }

    item.appendChild(head)
    item.appendChild(body)
    list.appendChild(item)
  }

  return list
}

function highlightTimeline(version, topic) {
  document.querySelectorAll('.patch-timeline__item').forEach((item) => {
    const match = !version || item.dataset.version === version
    item.classList.toggle('is-highlight', match)
  })
  document.querySelectorAll('.patch-timeline__group').forEach((group) => {
    const item = group.closest('.patch-timeline__item')
    const matchTopic = !topic || group.dataset.topic === topic
    group.classList.toggle('is-highlight', Boolean(item?.classList.contains('is-highlight') && matchTopic))
  })
  if (version) {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`release-${version.replace(/\./g, '-')}`)?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'nearest',
    })
  }
}

export async function initPatchNotes() {
  const root = document.getElementById('patch-notes-root')
  if (!root) return

  let data
  try {
    const res = await fetch(DATA_URL)
    if (!res.ok) throw new Error(res.statusText)
    data = await res.json()
  } catch {
    root.textContent = 'Patch notes could not be loaded.'
    return
  }

  const releases = data.releases
  if (!Array.isArray(releases) || releases.length === 0) {
    root.textContent = 'No releases yet.'
    return
  }

  const layout = el('div', 'patch-notes__layout')
  let mindmapApi

  const select = (version, topic) => {
    mindmapApi?.setActive(version ?? null, topic ?? null)
    highlightTimeline(version ?? null, topic ?? null)
  }

  mindmapApi = buildMindmap(releases, select)
  layout.appendChild(mindmapApi.wrap)
  layout.appendChild(buildTimeline(releases, (v) => select(v, null)))

  root.appendChild(layout)

  const latestVersion = newestFirst(releases)[0]?.version ?? null
  select(latestVersion, null)
}
