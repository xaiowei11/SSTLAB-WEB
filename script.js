document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('main-menu');

  if (navToggle && menu) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('show');
    });
  }

  // Tab 控制與動態載入
  const tabs = Array.from(document.querySelectorAll('.tab-btn')); // 現在為 <a href="#id">
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  const cache = {}; // 快取已載入的 HTML 片段

  async function loadPanelContent(panel) {
    const container = panel.querySelector('.tab-panel-content');
    if (!container) return;
    const src = container.dataset.src;
    if (!src) return;
    if (cache[src]) {
      container.innerHTML = cache[src];
      container.dataset.loaded = 'true';
      return;
    }
    // 顯示載入中
    container.innerHTML = '<p>載入中…</p>';
    panel.setAttribute('aria-busy', 'true');
    try {
      const res = await fetch(src, { cache: 'no-cache' });
      if (!res.ok) throw new Error('載入失敗');
      const html = await res.text();
      cache[src] = html;
      container.innerHTML = html;
      container.dataset.loaded = 'true';
    } catch (err) {
      container.innerHTML = '<p>內容載入失敗，請稍後再試。</p>';
      container.dataset.loaded = 'error';
      console.error('loadPanelContent', src, err);
    } finally {
      panel.removeAttribute('aria-busy');
    }
  }

  function showTab(id, options = { focus: false, scroll: false }) {
    // 更新按鈕狀態
    tabs.forEach(btn => {
      const target = btn.dataset.target;
      const isActive = target === id;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
    // 更新面板顯示
    panels.forEach(p => {
      const active = p.id === id;
      p.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    // 更新 URL hash（replaceState 避免推入太多 history）
    try {
      const newHash = '#' + id;
      if (location.hash !== newHash) {
        history.replaceState(null, '', newHash);
      }
    } catch (e) {}

    // 載入內容（若尚未載入）
    const panel = document.getElementById(id);
    if (panel) {
      const container = panel.querySelector('.tab-panel-content');
      if (container && container.dataset.loaded !== 'true') {
        loadPanelContent(panel).then(() => {
          if (options.scroll) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else {
        if (options.scroll) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    if (options.focus) {
      const btn = tabs.find(b => b.dataset.target === id);
      if (btn) btn.focus();
    }
  }

  // initTabs 改為解析 href 的 hash 作為目標 id
  function initTabs() {
    tabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // btn 是 <a href="#id">，避免預設跳轉
        e.preventDefault();
        const href = btn.getAttribute('href') || '';
        const id = href.startsWith('#') ? href.slice(1) : href;
        if (!id) return;
        showTab(id, { focus: true, scroll: true });
      });
    });

    // 若有 hash，優先顯示對應 tab（hash 可能是 #about 等）
    const initial = (location.hash && location.hash.replace('#', '')) || 'about';
    const valid = panels.some(p => p.id === initial) ? initial : 'about';
    showTab(valid, { focus: false, scroll: false });

    // 監聽 hashchange（例如使用者貼入連結或後退）
    window.addEventListener('hashchange', () => {
      const id = location.hash.replace('#', '') || 'about';
      if (panels.some(p => p.id === id)) showTab(id, { focus: false, scroll: true });
    });
  }

  initTabs();

  // 平滑捲動（內部連結）——改為先切到對應 tab 再捲動
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length > 1) {
        const targetId = href.replace('#', '');
        const target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          if (panels.some(p => p.id === targetId)) {
            showTab(targetId, { focus: false, scroll: true });
          } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          // 若為手機展開的選單，關閉它
          if (menu && menu.classList.contains('show')) {
            menu.classList.remove('show');
            if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
          }
        }
      }
    });
  });

  // 聯絡表單
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData);
      try {
        const res = await fetch(contactForm.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('網路錯誤，請稍後再試');
        const result = await res.json();
        alert(result.message || '感謝您的留言，我們會儘快聯絡您！');
        contactForm.reset();
      } catch (err) {
        alert(err.message || '發生錯誤，請稍後再試');
        console.error('contactForm submit', err);
      }
    });
  }
});
