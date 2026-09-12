/* ========== 动漫番剧推荐站 - 核心逻辑 ========== */
(function () {
  'use strict';

  const STATUS_LABELS = {
    airing: '新番连载',
    finished: '已完结',
    upcoming: '即将开播',
    movie: '剧场版',
    ova: 'OVA',
    oad: 'OAD'
  };

  const QUARTER_LABELS = {
    1: '冬',
    2: '春',
    3: '夏',
    4: '秋'
  };

  const state = {
    allAnimes: [],
    filteredAnimes: [],
    filters: {
      status: 'all',
      genre: 'all',
      year: 'all'
    },
    searchQuery: '',
    sortBy: 'hot-desc',
    favorites: new Set(),
    currentDetailId: null,
    currentDetailTab: 'intro'
  };

  const els = {};

  function resolveDataPath() {
    const base = document.querySelector('base');
    if (base) {
      return new URL('data/data.json', base.href).href;
    }
    const scriptEl = document.querySelector('script[src*="app.js"]');
    if (scriptEl && scriptEl.src) {
      const jsUrl = new URL(scriptEl.src, location.href);
      const root = jsUrl.pathname.split('/').slice(0, -2).join('/') || '/';
      return root + '/data/data.json';
    }
    return './data/data.json';
  }

  function $(id) {
    return document.getElementById(id);
  }

  function createEl(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function formatHotScore(score) {
    if (score >= 10000) {
      return (score / 10000).toFixed(1) + '万';
    }
    return score.toLocaleString();
  }

  function getStars(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty);
  }

  function loadFavorites() {
    try {
      const saved = localStorage.getItem('anime_favorites');
      if (saved) {
        const arr = JSON.parse(saved);
        state.favorites = new Set(arr);
      }
    } catch (e) {
      console.warn('读取收藏失败:', e);
    }
    updateFavCount();
  }

  function saveFavorites() {
    try {
      localStorage.setItem('anime_favorites', JSON.stringify([...state.favorites]));
    } catch (e) {
      console.warn('保存收藏失败:', e);
    }
    updateFavCount();
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) {
      state.favorites.delete(id);
    } else {
      state.favorites.add(id);
    }
    saveFavorites();
    renderAnimeGrid();
    if (state.currentDetailId === id) {
      renderDetailModal(findAnimeById(id));
    }
  }

  function updateFavCount() {
    if (els.favCount) {
      els.favCount.textContent = state.favorites.size;
      els.favCount.style.display = state.favorites.size > 0 ? 'flex' : 'none';
    }
  }

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem('anime_theme');
    } catch (e) {}

    if (saved) {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        try {
          if (!localStorage.getItem('anime_theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
          }
        } catch {}
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (els.themeIcon) {
      els.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem('anime_theme', next);
    } catch (e) {}
  }

  async function loadData() {
    showState('loading');
    try {
      const path = resolveDataPath();
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('数据格式错误');
      }
      state.allAnimes = data;
      state.filteredAnimes = [...data];
      showState(null);
      applyFiltersAndSort();
    } catch (err) {
      console.error('加载数据失败:', err);
      showState('error');
    }
  }

  function showState(type) {
    if (!els.loadingState || !els.emptyState || !els.errorState || !els.animeGrid || !els.resultInfo) return;
    els.loadingState.classList.add('hidden');
    els.emptyState.classList.add('hidden');
    els.errorState.classList.add('hidden');
    els.animeGrid.classList.remove('hidden');
    els.resultInfo.classList.remove('hidden');

    if (type === 'loading') {
      els.loadingState.classList.remove('hidden');
      els.animeGrid.classList.add('hidden');
      els.resultInfo.classList.add('hidden');
    } else if (type === 'empty') {
      els.emptyState.classList.remove('hidden');
      els.animeGrid.classList.add('hidden');
    } else if (type === 'error') {
      els.errorState.classList.remove('hidden');
      els.animeGrid.classList.add('hidden');
      els.resultInfo.classList.add('hidden');
    }
  }

  function findAnimeById(id) {
    return state.allAnimes.find(a => a.id === id) || null;
  }

  function applyFiltersAndSort() {
    const q = state.searchQuery.trim().toLowerCase();

    let result = state.allAnimes.filter(anime => {
      if (state.filters.status !== 'all' && anime.status !== state.filters.status) {
        return false;
      }
      if (state.filters.genre !== 'all' && !anime.genres.includes(state.filters.genre)) {
        return false;
      }
      if (state.filters.year !== 'all') {
        if (state.filters.year === 'older') {
          if (anime.seasonYear >= 2020) return false;
        } else {
          if (String(anime.seasonYear) !== state.filters.year) return false;
        }
      }
      if (q) {
        const fields = [
          anime.cnName, anime.jpName, anime.enName,
          anime.studio, anime.director, anime.originalSource,
          ...(anime.writers || []),
          ...(anime.tags || []),
          ...(anime.mainCVs || []).map(c => c.name + ' ' + c.roleName),
          ...(anime.characters || []).map(c => c.name + ' ' + c.CV),
          ...(anime.staffs || []).map(s => s.name + ' ' + s.post)
        ].filter(Boolean).join(' ').toLowerCase();
        if (!fields.includes(q)) return false;
      }
      return true;
    });

    result = sortAnimes(result, state.sortBy);
    state.filteredAnimes = result;

    if (result.length === 0 && state.allAnimes.length > 0) {
      showState('empty');
    } else {
      showState(null);
    }

    renderResultInfo();
    renderAnimeGrid();
  }

  function sortAnimes(arr, sortBy) {
    const a = [...arr];
    switch (sortBy) {
      case 'hot-desc': a.sort((x, y) => y.hotScore - x.hotScore); break;
      case 'hot-asc': a.sort((x, y) => x.hotScore - y.hotScore); break;
      case 'rating-desc': a.sort((x, y) => y.rating - x.rating); break;
      case 'rating-asc': a.sort((x, y) => x.rating - y.rating); break;
      case 'year-desc': a.sort((x, y) => (y.seasonYear * 10 + y.seasonQuarter) - (x.seasonYear * 10 + x.seasonQuarter)); break;
      case 'year-asc': a.sort((x, y) => (x.seasonYear * 10 + x.seasonQuarter) - (y.seasonYear * 10 + y.seasonQuarter)); break;
      case 'name-asc': a.sort((x, y) => x.cnName.localeCompare(y.cnName, 'zh-CN')); break;
      case 'name-desc': a.sort((x, y) => y.cnName.localeCompare(x.cnName, 'zh-CN')); break;
    }
    return a;
  }

  function renderResultInfo() {
    if (!els.resultInfo) return;
    const total = state.filteredAnimes.length;
    const filterDesc = [];
    if (state.filters.status !== 'all') filterDesc.push(STATUS_LABELS[state.filters.status] || '');
    if (state.filters.genre !== 'all') filterDesc.push(state.filters.genre);
    if (state.filters.year !== 'all') filterDesc.push(state.filters.year === 'older' ? '更早' : state.filters.year + '年');
    if (state.searchQuery.trim()) filterDesc.push('关键词:"' + state.searchQuery.trim() + '"');

    const desc = filterDesc.length > 0 ? ' · ' + filterDesc.join(' + ') : '';
    els.resultInfo.innerHTML = `共找到 <strong>${total}</strong> 部番剧${desc}`;
  }

  function renderAnimeGrid() {
    if (!els.animeGrid) return;
    const grid = els.animeGrid;
    grid.innerHTML = '';

    const frag = document.createDocumentFragment();
    for (const anime of state.filteredAnimes) {
      frag.appendChild(buildAnimeCard(anime));
    }
    grid.appendChild(frag);
  }

  function buildAnimeCard(anime) {
    const card = createEl('div', 'anime-card');
    card.dataset.id = anime.id;

    const cover = createEl('div', 'card-cover');
    cover.innerHTML = `<img src="${anime.cover}" alt="${anime.cnName}" loading="lazy" onerror="this.src='https://picsum.photos/seed/fallback${anime.id}/400/560'">`;

    const statusBadge = createEl('span', `card-status-badge status-${anime.status}`, STATUS_LABELS[anime.status] || '');
    cover.appendChild(statusBadge);

    const favBtn = createEl('button', 'card-fav-btn' + (state.favorites.has(anime.id) ? ' active' : ''), state.favorites.has(anime.id) ? '❤' : '🤍');
    favBtn.title = state.favorites.has(anime.id) ? '取消收藏' : '收藏';
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(anime.id);
    });
    cover.appendChild(favBtn);

    const info = createEl('div', 'card-info');

    const titles = createEl('div', 'card-titles');
    titles.innerHTML = `
      <div class="card-cn-name">${anime.cnName}</div>
      <div class="card-jp-name">${anime.jpName || ''}</div>
    `;
    info.appendChild(titles);

    const metrics = createEl('div', 'card-metrics');
    metrics.innerHTML = `
      <span class="metric metric-rating">⭐ ${anime.rating}</span>
      <span class="metric metric-hot">🔥 ${formatHotScore(anime.hotScore)}</span>
    `;
    info.appendChild(metrics);

    const tags = createEl('div', 'card-tags');
    const displayGenres = (anime.genres || []).slice(0, 3);
    displayGenres.forEach(g => {
      tags.appendChild(createEl('span', `genre-tag tag-${g}`, g));
    });
    if (anime.episodes > 0) {
      const epTag = createEl('span', 'genre-tag', (anime.status === 'movie' ? '剧场版' : `全${anime.episodes}集`));
      epTag.style.background = 'rgba(99,102,241,0.08)';
      epTag.style.color = 'var(--primary)';
      epTag.style.borderColor = 'rgba(99,102,241,0.15)';
      tags.appendChild(epTag);
    }
    info.appendChild(tags);

    const footer = createEl('div', 'card-footer');
    footer.innerHTML = `
      <span class="card-studio" title="${anime.studio || ''}">🎬 ${anime.studio || '未知'}</span>
      <span class="card-year">📅 ${anime.seasonYear}</span>
    `;
    info.appendChild(footer);

    card.appendChild(cover);
    card.appendChild(info);

    card.addEventListener('click', () => openDetail(anime.id));

    return card;
  }

  function openDetail(id) {
    const anime = findAnimeById(id);
    if (!anime) return;
    state.currentDetailId = id;
    state.currentDetailTab = 'intro';
    renderDetailModal(anime);
    showModal(true);
    updateHash(id);
  }

  function closeDetail() {
    showModal(false);
    state.currentDetailId = null;
    clearHash();
  }

  function showModal(visible) {
    if (!els.modalOverlay) return;
    if (visible) {
      els.modalOverlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    } else {
      els.modalOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  function renderDetailModal(anime) {
    if (!els.modalBody || !anime) return;
    const isFav = state.favorites.has(anime.id);
    const rd = anime.ratingDistribution || { '1': 5, '2': 10, '3': 25, '4': 35, '5': 25 };

    const relatedSameGenres = (anime.relatedIds?.sameGenres || []).map(findAnimeById).filter(Boolean);
    const relatedSameQuarter = (anime.relatedIds?.sameQuarter || []).map(findAnimeById).filter(Boolean);
    const relatedSameStudio = (anime.relatedIds?.sameStudio || []).map(findAnimeById).filter(Boolean);

    els.modalBody.innerHTML = `
      <div class="detail-banner">
        <img src="${anime.banner}" alt="" onerror="this.src='https://picsum.photos/seed/banner${anime.id}/1920/500'">
        <div class="banner-overlay"></div>
        <div class="banner-content">
          <div class="detail-cover">
            <img src="${anime.cover}" alt="${anime.cnName}" onerror="this.src='https://picsum.photos/seed/cover${anime.id}/400/560'">
          </div>
          <div class="detail-titles">
            <div class="detail-cn">${anime.cnName}</div>
            <div class="detail-jp">${anime.jpName || ''}</div>
            <div class="detail-rating-row">
              <div class="detail-score">
                <span class="detail-score-num">${anime.rating}</span>
                <span class="detail-score-stars">${getStars(anime.rating)}</span>
              </div>
              <span class="detail-hot">🔥 ${formatHotScore(anime.hotScore)}</span>
              <span class="detail-status-tag status-${anime.status}">${STATUS_LABELS[anime.status] || ''}</span>
              <button class="card-fav-btn ${isFav ? 'active' : ''}" id="detailFavBtn" title="${isFav ? '取消收藏' : '收藏'}">${isFav ? '❤' : '🤍'}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-content">
        <div class="detail-info-grid">
          <div class="info-item"><span class="info-label">原作类型</span><span class="info-value">${anime.originalSource || '-'}</span></div>
          <div class="info-item"><span class="info-label">播出状态</span><span class="info-value">${STATUS_LABELS[anime.status] || '-'}</span></div>
          <div class="info-item"><span class="info-label">播出年份</span><span class="info-value">${anime.seasonYear}年 ${QUARTER_LABELS[anime.seasonQuarter] || ''}季</span></div>
          <div class="info-item"><span class="info-label">集数</span><span class="info-value">${anime.episodes > 0 ? (anime.status === 'movie' ? '剧场版 1部' : `全${anime.episodes}集`) : '未开播'}</span></div>
          <div class="info-item"><span class="info-label">单集时长</span><span class="info-value">${anime.durationMin || '-'} 分钟</span></div>
          <div class="info-item"><span class="info-label">制作公司</span><span class="info-value">${anime.studio || '-'}</span></div>
          <div class="info-item"><span class="info-label">导演</span><span class="info-value">${anime.director || '-'}</span></div>
          <div class="info-item"><span class="info-label">编剧</span><span class="info-value">${(anime.writers || []).join('、') || '-'}</span></div>
          <div class="info-item"><span class="info-label">原作</span><span class="info-value">${anime.originalSource || '-'}</span></div>
          <div class="info-item"><span class="info-label">首播日期</span><span class="info-value">${anime.firstAirDate || '-'}</span></div>
          <div class="info-item" style="grid-column: span 2;"><span class="info-label">主要声优</span>
            <div class="main-cvs">
              ${(anime.mainCVs || []).map(cv => `
                <div class="main-cv-item">
                  <div class="cv-avatar-sm"><img src="${cv.avatar}" alt="${cv.name}" onerror="this.src='https://picsum.photos/seed/cvfall${anime.id}${cv.name}/200/200'"></div>
                  <div class="cv-info-sm">
                    <span class="cv-name-sm">${cv.name}</span>
                    <span class="cv-role-sm">${cv.roleName}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="info-item" style="grid-column: span 2;">
            <span class="info-label">官方网站</span>
            <a class="info-value link" href="${anime.officialSite || '#'}" target="_blank" rel="noopener noreferrer">${anime.officialSite || '-'}</a>
          </div>
        </div>

        <div class="detail-tabs">
          <button class="detail-tab ${state.currentDetailTab === 'intro' ? 'active' : ''}" data-tab="intro">📖 剧情简介</button>
          <button class="detail-tab ${state.currentDetailTab === 'chars' ? 'active' : ''}" data-tab="chars">👥 角色介绍 (${(anime.characters || []).length})</button>
          <button class="detail-tab ${state.currentDetailTab === 'staff' ? 'active' : ''}" data-tab="staff">🎬 STAFF列表 (${(anime.staffs || []).length})</button>
          <button class="detail-tab ${state.currentDetailTab === 'cvs' ? 'active' : ''}" data-tab="cvs">🎙 声优阵容 (${(anime.mainCVs || []).length + (anime.characters || []).map(c=>c.CV).filter(Boolean).length})</button>
        </div>

        <div class="tab-panels">
          ${renderIntroPanel(anime, rd)}
          ${state.currentDetailTab === 'chars' ? renderCharsPanel(anime) : ''}
          ${state.currentDetailTab === 'staff' ? renderStaffPanel(anime) : ''}
          ${state.currentDetailTab === 'cvs' ? renderCVsPanel(anime) : ''}
        </div>

        <div class="related-section">
          ${relatedSameGenres.length > 0 ? renderRelatedGroup('🎯 同类型推荐', relatedSameGenres) : ''}
          ${relatedSameQuarter.length > 0 ? renderRelatedGroup('📅 同季度番剧', relatedSameQuarter) : ''}
          ${relatedSameStudio.length > 0 ? renderRelatedGroup('🎬 同制作公司', relatedSameStudio) : ''}
        </div>
      </div>
    `;

    const favBtn = $('detailFavBtn');
    if (favBtn) {
      favBtn.addEventListener('click', () => toggleFavorite(anime.id));
    }

    const tabBtns = els.modalBody.querySelectorAll('.detail-tab');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentDetailTab = btn.dataset.tab;
        renderDetailModal(anime);
      });
    });

    const relatedCards = els.modalBody.querySelectorAll('.related-card');
    relatedCards.forEach(card => {
      card.addEventListener('click', () => {
        const rid = Number(card.dataset.id);
        if (rid) openDetail(rid);
      });
    });
  }

  function renderIntroPanel(anime, rd) {
    return `
      <div class="tab-panel intro-panel">
        <p>${anime.intro || '暂无剧情简介。'}</p>
        <div class="intro-tags">
          ${(anime.tags || []).map(t => `<span class="genre-tag tag-${t}">#${t}</span>`).join('')}
        </div>
        <div class="rating-section">
          <h3 class="rating-title">📊 评分分布</h3>
          <div class="rating-bars">
            <div class="rating-bar-row">
              <span class="rating-label">5星</span>
              <div class="rating-bar-track"><div class="rating-bar-fill r5" style="width:${rd['5']}%"></div></div>
              <span class="rating-percent">${rd['5']}%</span>
            </div>
            <div class="rating-bar-row">
              <span class="rating-label">4星</span>
              <div class="rating-bar-track"><div class="rating-bar-fill r4" style="width:${rd['4']}%"></div></div>
              <span class="rating-percent">${rd['4']}%</span>
            </div>
            <div class="rating-bar-row">
              <span class="rating-label">3星</span>
              <div class="rating-bar-track"><div class="rating-bar-fill r3" style="width:${rd['3']}%"></div></div>
              <span class="rating-percent">${rd['3']}%</span>
            </div>
            <div class="rating-bar-row">
              <span class="rating-label">2星</span>
              <div class="rating-bar-track"><div class="rating-bar-fill r2" style="width:${rd['2']}%"></div></div>
              <span class="rating-percent">${rd['2']}%</span>
            </div>
            <div class="rating-bar-row">
              <span class="rating-label">1星</span>
              <div class="rating-bar-track"><div class="rating-bar-fill r1" style="width:${rd['1']}%"></div></div>
              <span class="rating-percent">${rd['1']}%</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderCharsPanel(anime) {
    const chars = anime.characters || [];
    if (chars.length === 0) {
      return '<div class="tab-panel"><p style="color:var(--text-tertiary);text-align:center;padding:40px;">暂无角色介绍</p></div>';
    }
    return `
      <div class="tab-panel">
        <div class="character-grid">
          ${chars.map(c => `
            <div class="character-card">
              <div class="character-avatar"><img src="${c.avatar}" alt="${c.name}" onerror="this.src='https://picsum.photos/seed/chfall${anime.id}${c.name}/300/300'"></div>
              <div class="character-info">
                <div class="character-name">${c.name}</div>
                <div class="character-cv">CV: ${c.CV || '-'}</div>
                <div class="character-intro">${c.intro || '暂无角色简介。'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderStaffPanel(anime) {
    const staffs = anime.staffs || [];
    if (staffs.length === 0) {
      return '<div class="tab-panel"><p style="color:var(--text-tertiary);text-align:center;padding:40px;">暂无STAFF信息</p></div>';
    }
    return `
      <div class="tab-panel">
        <div class="staff-list">
          ${staffs.map(s => `
            <div class="staff-item">
              <span class="staff-post">${s.post}</span>
              <span class="staff-name">${s.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderCVsPanel(anime) {
    const cvMap = new Map();
    (anime.mainCVs || []).forEach(c => {
      cvMap.set(c.name, { name: c.name, role: c.roleName, avatar: c.avatar, intro: c.intro });
    });
    (anime.characters || []).forEach(c => {
      if (c.CV && !cvMap.has(c.CV)) {
        cvMap.set(c.CV, { name: c.CV, role: c.name, avatar: `https://picsum.photos/seed/cvm${anime.id}${c.CV}/200/200`, intro: `为 ${c.name} 配音` });
      }
    });
    const cvs = Array.from(cvMap.values());
    if (cvs.length === 0) {
      return '<div class="tab-panel"><p style="color:var(--text-tertiary);text-align:center;padding:40px;">暂无声优信息</p></div>';
    }
    return `
      <div class="tab-panel">
        <div class="cv-grid">
          ${cvs.map(c => `
            <div class="cv-card">
              <div class="cv-avatar"><img src="${c.avatar}" alt="${c.name}" onerror="this.src='https://picsum.photos/seed/cvfall${anime.id}${c.name}/200/200'"></div>
              <div class="cv-info">
                <div class="cv-name">${c.name}</div>
                <div class="cv-role">役: ${c.role}</div>
                <div class="cv-intro">${c.intro || ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderRelatedGroup(title, animes) {
    return `
      <div class="related-group">
        <h3 class="related-group-title">${title}</h3>
        <div class="related-grid">
          ${animes.slice(0, 6).map(a => `
            <div class="related-card" data-id="${a.id}">
              <div class="related-cover">
                <img src="${a.cover}" alt="${a.cnName}" loading="lazy" onerror="this.src='https://picsum.photos/seed/relfall${a.id}/400/560'">
              </div>
              <div class="related-name">${a.cnName}</div>
              <div class="related-rating">⭐ ${a.rating} · ${STATUS_LABELS[a.status] || ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function updateHash(id) {
    const newHash = `#/anime/${id}`;
    if (location.hash !== newHash) {
      history.pushState(null, '', newHash);
    }
  }

  function clearHash() {
    if (location.hash.startsWith('#/anime/')) {
      history.pushState(null, '', location.pathname + location.search);
    }
  }

  function parseHash() {
    const hash = location.hash || '';
    const m = hash.match(/^#\/anime\/(\d+)/);
    if (m) {
      return Number(m[1]);
    }
    return null;
  }

  function handleHashChange() {
    const id = parseHash();
    if (id) {
      const anime = findAnimeById(id);
      if (anime) {
        state.currentDetailId = id;
        state.currentDetailTab = 'intro';
        renderDetailModal(anime);
        showModal(true);
        return;
      }
    }
    if (state.currentDetailId) {
      closeDetail();
    }
  }

  function initBackToTop() {
    const btn = els.backToTop;
    if (!btn) return;
    const onScroll = () => {
      if (window.scrollY > 300) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    onScroll();
  }

  function initFilters() {
    const statusTabs = $('statusTabs');
    if (statusTabs) {
      statusTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        statusTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filters.status = btn.dataset.status;
        applyFiltersAndSort();
      });
    }

    const genreTabs = $('genreTabs');
    if (genreTabs) {
      genreTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        genreTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filters.genre = btn.dataset.genre;
        applyFiltersAndSort();
      });
    }

    const yearTabs = $('yearTabs');
    if (yearTabs) {
      yearTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        yearTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filters.year = btn.dataset.year;
        applyFiltersAndSort();
      });
    }

    const sortSelect = $('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        state.sortBy = sortSelect.value;
        applyFiltersAndSort();
      });
    }
  }

  function initSearch() {
    const input = els.searchInput;
    const clearBtn = els.clearSearch;
    if (!input) return;

    const doSearch = debounce(() => {
      state.searchQuery = input.value;
      if (clearBtn) {
        clearBtn.classList.toggle('visible', input.value.length > 0);
      }
      applyFiltersAndSort();
    }, 300);

    input.addEventListener('input', doSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
      if (e.key === 'Escape') {
        input.value = '';
        state.searchQuery = '';
        if (clearBtn) clearBtn.classList.remove('visible');
        applyFiltersAndSort();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        input.focus();
        state.searchQuery = '';
        clearBtn.classList.remove('visible');
        applyFiltersAndSort();
      });
    }
  }

  function initModal() {
    if (els.modalOverlay) {
      els.modalOverlay.addEventListener('click', (e) => {
        if (e.target === els.modalOverlay) closeDetail();
      });
    }
    if (els.modalClose) {
      els.modalClose.addEventListener('click', closeDetail);
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.currentDetailId) {
        closeDetail();
      }
    });
    window.addEventListener('popstate', handleHashChange);
    window.addEventListener('hashchange', handleHashChange);
  }

  function initFavBtn() {
    if (els.favBtn) {
      els.favBtn.addEventListener('click', () => {
        if (state.favorites.size === 0) {
          alert('还没有收藏任何番剧哦，快去添加吧！');
          return;
        }
        const savedFilters = { ...state.filters };
        const savedSearch = state.searchQuery;
        const savedSort = state.sortBy;
        state.filters = { status: 'all', genre: 'all', year: 'all' };
        state.searchQuery = '';
        state.sortBy = 'hot-desc';
        state.filteredAnimes = state.allAnimes.filter(a => state.favorites.has(a.id));
        ['statusTabs', 'genreTabs', 'yearTabs'].forEach(id => {
          const tabs = $(id);
          if (tabs) {
            tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            const first = tabs.querySelector('.tab-btn');
            if (first) first.classList.add('active');
          }
        });
        if (els.searchInput) els.searchInput.value = '';
        if (els.clearSearch) els.clearSearch.classList.remove('visible');
        if (els.sortSelect) els.sortSelect.value = 'hot-desc';
        showState(null);
        renderResultInfo();
        els.resultInfo.innerHTML = `❤ 我的收藏：共 <strong>${state.filteredAnimes.length}</strong> 部（点击顶部Logo返回全部）`;
        renderAnimeGrid();
      });
    }

    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', () => {
        state.filters = { status: 'all', genre: 'all', year: 'all' };
        state.searchQuery = '';
        state.sortBy = 'hot-desc';
        if (els.searchInput) els.searchInput.value = '';
        if (els.clearSearch) els.clearSearch.classList.remove('visible');
        if (els.sortSelect) els.sortSelect.value = 'hot-desc';
        ['statusTabs', 'genreTabs', 'yearTabs'].forEach(id => {
          const tabs = $(id);
          if (tabs) {
            tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            const first = tabs.querySelector('.tab-btn');
            if (first) first.classList.add('active');
          }
        });
        applyFiltersAndSort();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function cacheElements() {
    els.searchInput = $('searchInput');
    els.clearSearch = $('clearSearch');
    els.animeGrid = $('animeGrid');
    els.resultInfo = $('resultInfo');
    els.emptyState = $('emptyState');
    els.loadingState = $('loadingState');
    els.errorState = $('errorState');
    els.retryBtn = $('retryBtn');
    els.modalOverlay = $('modalOverlay');
    els.modalContent = $('modalContent');
    els.modalBody = $('modalBody');
    els.modalClose = $('modalClose');
    els.backToTop = $('backToTop');
    els.themeBtn = $('themeBtn');
    els.themeIcon = $('themeIcon');
    els.favBtn = $('favBtn');
    els.favCount = $('favCount');
    els.sortSelect = $('sortSelect');
  }

  function init() {
    cacheElements();
    initTheme();
    loadFavorites();
    initFilters();
    initSearch();
    initModal();
    initBackToTop();
    initFavBtn();

    if (els.themeBtn) {
      els.themeBtn.addEventListener('click', toggleTheme);
    }
    if (els.retryBtn) {
      els.retryBtn.addEventListener('click', loadData);
    }

    loadData().then(() => {
      handleHashChange();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
