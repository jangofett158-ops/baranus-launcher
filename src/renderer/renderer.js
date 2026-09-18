const $ = (id) => document.getElementById(id);
// Allow the design preview to work when index.html is opened directly in a
// browser. The real Electron bridge takes precedence in the packaged launcher.
if (!window.launcher) {
  window.launcher = {
    info: async () => ({ maxRamGb: 16, ramGb: 4, nickname: 'Player', version: '0.2.6', contentState: 'install', launcherSettings: { resolution: '960x700', fullscreen: false, launchBehavior: 'keep' } }),
    setNickname: async (value) => value,
    setRam: async () => {}, setLauncherSettings: async (settings) => settings, mainAction: async () => ({ state: 'ready' }),
    checkUpdate: async () => null, applyUpdate: async () => {},
    openMods: async () => {}, openShaders: async () => {}, openResourcepacks: async () => {}, openTelegram: () => window.open('https://t.me/baranus2', '_blank'), openSupport: () => window.open('https://t.me/poderzkabaranus_bot', '_blank'), openTikTok: () => window.open('https://www.tiktok.com/@baranuslauncher', '_blank'), openYouTube: () => window.open('https://www.youtube.com/@abobus84837', '_blank'),
    onStatus: () => {}, onProgress: () => {}, onLog: () => {}, onError: () => {}, onFinished: () => {}
  };
}
const status = $('status'), log = $('log'), fill = $('progressFill'), progressText = $('progressText');
const ram = $('ram'), ramValue = $('ramValue'), ramHint = $('ramHint'), nickname = $('nickname');
const update = $('update'), version = $('version'), greeting = $('greeting'), settingsPanel = $('settingsPanel');
const launcherUpdateProgress = $('launcherUpdateProgress'), launcherUpdateFill = $('launcherUpdateFill'), launcherUpdateText = $('launcherUpdateText');
const nameModal = $('nameModal'), firstNickname = $('firstNickname'), action = $('mainAction');
const actionTitle = $('mainActionTitle'), actionHint = $('mainActionHint');
const windowResolution = $('windowResolution'), fullscreen = $('fullscreen'), launchBehavior = $('launchBehavior');
let contentState = 'install';
const pageMusic = {
  main: new Audio('main-theme.mp3'),
  '1122': new Audio('space-theme.mp3'),
  '1165a': new Audio('scp-theme.mp3'),
  '1165b': new Audio('vanilla-theme.mp3')
};
Object.values(pageMusic).forEach((track) => {
  track.loop = true;
  track.volume = 0.12;
});
pageMusic.main.volume = 0.055;
pageMusic['1165a'].volume = 0.22;
function syncPageMusic(page) {
  Object.entries(pageMusic).forEach(([name, track]) => {
    if (name === page) {
      track.play().catch(() => {});
      return;
    }
    track.pause();
    track.currentTime = 0;
  });
}
nameModal.style.display = 'none';
function showGreeting(name) { greeting.textContent = name ? `Добро пожаловать, ${name}!` : 'Добро пожаловать!'; }
function renderAction(state) { contentState = state; const text = state === 'play' ? ['Играть', 'Запустить Minecraft'] : state === 'sync' ? ['Обновить', 'Проверить и обновить файлы сборки'] : ['Установить', '']; actionTitle.textContent = text[0]; actionHint.textContent = text[1]; action.classList.toggle('is-play', state === 'play'); action.classList.toggle('is-sync', state === 'sync'); }
function renderLauncherSettings(value = {}) { windowResolution.value = value.resolution || '960x700'; fullscreen.checked = Boolean(value.fullscreen); launchBehavior.value = value.launchBehavior || 'keep'; }
async function saveLauncherSettings() { const saved = await window.launcher.setLauncherSettings({ resolution: windowResolution.value, fullscreen: fullscreen.checked, launchBehavior: launchBehavior.value }); renderLauncherSettings(saved); }
function openSettings() { settingsPanel.hidden = false; requestAnimationFrame(() => settingsPanel.classList.add('is-open')); }
function hideSettings() { settingsPanel.classList.remove('is-open'); window.setTimeout(() => { if (!settingsPanel.classList.contains('is-open')) settingsPanel.hidden = true; }, 180); }
function renderLauncherUpdateProgress(value = 0, indeterminate = false) { launcherUpdateProgress.hidden = false; launcherUpdateFill.style.width = `${Math.max(0, Math.min(100, value || 0))}%`; launcherUpdateFill.classList.toggle('indeterminate', Boolean(indeterminate)); launcherUpdateText.textContent = indeterminate ? '…' : `${Math.round(value || 0)}%`; }
async function saveNickname(value) { const name = await window.launcher.setNickname(value); nickname.value = name; showGreeting(name); return name; }
window.launcher.info().then((info) => { ram.max = info.maxRamGb; ram.value = info.ramGb; ramValue.textContent = `${info.ramGb} ГБ`; ramHint.textContent = `Максимум: ${info.maxRamGb} ГБ`; version.textContent = `v${info.version}`; nickname.value = info.nickname; showGreeting(info.nickname); renderAction(info.contentState); renderLauncherSettings(info.launcherSettings); status.textContent = info.contentState === 'play' ? 'Сборка готова к запуску.' : info.contentState === 'sync' ? 'Доступно обновление файлов сборки.' : 'Нажми «Установить», чтобы подготовить сборку.'; showLauncherHome(); if (!info.nickname) { nameModal.hidden = false; nameModal.style.display = 'grid'; firstNickname.focus(); } else { startOnboardingIfNeeded(); } window.launcher.checkUpdate().then((release) => { if (release) { update.hidden = false; update.textContent = `ОБНОВИТЬ ДО ${release.version}`; } }); });
window.launcher.onStatus((message) => status.textContent = message);
window.launcher.onProgress(({ scope, value, indeterminate }) => { if (scope === 'launcher-update') { renderLauncherUpdateProgress(value, indeterminate); return; } fill.style.width = `${Math.max(0, Math.min(100, value || 0))}%`; fill.classList.toggle('indeterminate', Boolean(indeterminate)); progressText.textContent = indeterminate ? 'ПРОВЕРКА…' : `${Math.round(value || 0)}%`; });
window.launcher.onLog((message) => { log.textContent += `${message}\n`; log.scrollTop = log.scrollHeight; });
window.launcher.onError((message) => { status.textContent = `Ошибка: ${message}`; progressText.textContent = 'ОШИБКА'; action.disabled = false; document.querySelector('details').open = true; });
window.launcher.onFinished((code) => { status.textContent = `Игра завершена (код ${code}).`; action.disabled = false; });
$('mods').onclick = () => window.launcher.openMods();
$('shaders').onclick = () => window.launcher.openShaders();
$('resources').onclick = () => window.launcher.openResourcepacks();
$('settings').onclick = () => settingsPanel.hidden ? openSettings() : hideSettings();
$('closeSettings').onclick = hideSettings;
[windowResolution, fullscreen, launchBehavior].forEach((control) => { control.onchange = () => saveLauncherSettings().catch((error) => { status.textContent = `Ошибка настроек: ${error.message || error}`; }); });
$('firstNicknameSave').onclick = async () => { try { await saveNickname(firstNickname.value); nameModal.hidden = true; nameModal.style.display = 'none'; startOnboardingIfNeeded(); } catch (error) { status.textContent = `Ошибка: ${error.message}`; } };
firstNickname.onkeydown = (event) => { if (event.key === 'Enter') $('firstNicknameSave').click(); };
nickname.onchange = () => saveNickname(nickname.value).catch((error) => { status.textContent = `Ошибка: ${error.message}`; });
ram.oninput = () => { ramValue.textContent = `${ram.value} ГБ`; }; ram.onchange = () => window.launcher.setRam(Number(ram.value));
update.onclick = async () => { update.disabled = true; renderLauncherUpdateProgress(0, true); try { await window.launcher.applyUpdate(); } catch (error) { status.textContent = `Ошибка обновления: ${error.message}`; launcherUpdateText.textContent = 'ОШИБКА'; launcherUpdateFill.classList.remove('indeterminate'); update.disabled = false; } };
action.onclick = async () => { action.disabled = true; try { await saveNickname(nickname.value); const result = await window.launcher.mainAction({ nickname: nickname.value.trim(), ramGb: Number(ram.value) }); if (result?.state === 'ready') { renderAction('play'); status.textContent = result.warning ? 'Не все файлы обновились, но игру можно запустить.' : 'Сборка готова к запуску.'; } if (result?.state === 'launched') status.textContent = 'Minecraft запущен.'; } catch (error) { status.textContent = `Ошибка: ${error.message || error}`; progressText.textContent = 'ОШИБКА'; } finally { action.disabled = false; } };

const homePage = $('homePage');
const futurePage = $('futurePage');
function renderFuturePage(page) {
  if (page === '1165a') {
    futurePage.className = 'future-page scp-page';
    futurePage.innerHTML = `<div class="scp-stripe" aria-hidden="true"></div><p class="scp-overline">SCP FOUNDATION // RESTRICTED ACCESS</p><h1>SCP<br><span>CONTAINMENT</span></h1><p class="scp-description">Защищать. Содержать. Сохранять.</p><section class="scp-clearance"><span>РАЗРЕШЕНИЕ ДОСТУПА</span><b>УРОВЕНЬ 02</b><small>ПРОЕКТ НАХОДИТСЯ В РАЗРАБОТКЕ</small></section>`;
    return;
  }
  futurePage.className = 'future-page jungle-page';
  futurePage.innerHTML = `<h1>Minecraft<br><span>Vanilla 1.16.5</span></h1><p class="jungle-description">Исследуй мир, строй и выживай на ванильном сервере Майнкрафт.</p><div class="jungle-card"><b>1.16.5</b><span>VANILLA</span><small>ванильный майнкрафт</small></div>`;
}
document.querySelectorAll('.page-dot').forEach((dot) => {
  dot.onclick = () => {
    const isHome = dot.dataset.page === '1122';
    document.querySelectorAll('.page-dot').forEach((item) => item.classList.toggle('active', item === dot));
    launcherHome.hidden = true;
    document.body.dataset.theme = isHome ? 'space' : dot.dataset.page;
    homePage.hidden = !isHome;
    futurePage.hidden = isHome;
    if (!isHome) renderFuturePage(dot.dataset.page);
    syncPageMusic(dot.dataset.page);
  };
});

// The B mark is the launcher-wide home navigation, separate from game builds.
const launcherHome = document.createElement('section');
launcherHome.id = 'mainMenuPage';
launcherHome.className = 'main-menu-page';
launcherHome.hidden = true;
launcherHome.innerHTML = `
  <div class="home-placeholder-grid" aria-label="Главное меню">
    <section class="home-placeholder home-placeholder-large home-feature-card" role="button" tabindex="0" data-main-build title="Открыть описание сборки">
      <span class="home-card-tag">ОСНОВНАЯ СБОРКА</span>
      <div><h1>Космическая<br>сборка</h1><span>Minecraft 1.12.2 · Forge</span></div>
    </section>
    <div class="home-news-column">
      <span class="home-news-heading">NEWS</span>
      <section class="home-placeholder home-news-card" role="button" tabindex="0" data-news="01" title="Открыть новость">
        <span class="home-card-tag">ОБНОВЛЕНИЯ</span>
        <div><p>Обновление лаунчера 0.2.7</p><small>В лаунчере появился новостник.</small></div>
        <time>01</time>
      </section>
      <section class="home-placeholder home-news-card" role="button" tabindex="0" data-news="02" title="Открыть новость">
        <span class="home-card-tag">В РАЗРАБОТКЕ</span>
        <div><p>Новые сборки</p><small>Следите за новостями Baranus Launcher.</small></div>
        <time>02</time>
      </section>
    </div>
  </div>
  <div class="home-support-row">
    <button class="home-support-label" type="button" title="Открыть Telegram-бот поддержки">ПОДДЕРЖКА</button>
    <div class="home-socials" aria-label="Социальные сети">
      <span class="home-social tiktok" role="img" aria-label="Открыть TikTok Baranus Launcher"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18 6v15a5 5 0 1 1-4-5v4a2 2 0 1 0 1 2V6h3c1 4 3 5 6 5v4c-3 0-5-1-6-3" fill="white"/></svg></span>
      <span class="home-social youtube" role="img" aria-label="Открыть YouTube"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m12 8 13 8-13 8Z" fill="white"/></svg></span>
      <span class="home-social telegram" role="img" aria-label="Открыть Telegram Baranus"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 15 26 7l-4 19-7-6-4 4 1-7 10-7-12 6Z" fill="white"/></svg></span>
    </div>
  </div>`;
const homeNewsLabel = document.createElement('span');
homeNewsLabel.className = 'home-news-label';
homeNewsLabel.textContent = 'NEWS';
document.querySelector('.workspace > header').append(homeNewsLabel);
futurePage.before(launcherHome);
const newsModal = document.createElement('div');
newsModal.id = 'newsModal';
newsModal.className = 'news-modal';
newsModal.hidden = true;
newsModal.innerHTML = `<article class="news-modal-card" role="dialog" aria-modal="true" aria-labelledby="newsModalTitle"><button class="news-modal-close" type="button" aria-label="Закрыть новость">×</button><span class="news-modal-number"></span><h2 id="newsModalTitle"></h2><p class="news-modal-lead"></p><div class="news-modal-gallery"></div><div class="news-modal-body"></div></article>`;
document.body.append(newsModal);
const buildModal = document.createElement('div');
buildModal.id = 'buildModal';
buildModal.className = 'news-modal';
buildModal.hidden = true;
buildModal.innerHTML = `<article class="news-modal-card build-modal-card" role="dialog" aria-modal="true" aria-labelledby="buildModalTitle"><button class="news-modal-close" type="button" aria-label="Закрыть описание сборки">×</button><span class="news-modal-number">ОСНОВНАЯ СБОРКА</span><h2 id="buildModalTitle">Космическая сборка</h2><p class="news-modal-lead">Minecraft 1.12.2 · Forge</p><img class="build-modal-image" src="home-cosmic-preview.png" alt="Космическая сборка Baranus"><div class="news-modal-body"><p>Отправляйся в космическое приключение с <strong>Galacticraft</strong>!</p><p>Развивай технологии, автоматизируй добычу и производство, создавай мощные источники энергии и строй ракеты. Исследуй другие планеты, создавай космические станции и обустраивай базы за пределами Земли.</p><p>Играй вместе с друзьями и устрой настоящую <strong>космическую гонку</strong> — соревнуйтесь в развитии технологий, запуске первых ракет и покорении новых планет!</p></div><button class="build-modal-go" type="button">ПЕРЕЙТИ К СБОРКЕ</button></article>`;
document.body.append(buildModal);
const newsItems = {
  '01': {
    title: 'Обновление лаунчера 0.2.7',
    lead: 'В лаунчере появился новостник.',
    body: 'Главное меню стало удобнее: теперь новости открываются в отдельных окнах с подробным описанием и изображениями. Также исправлено открытие главного меню при запуске, обновлены фоновые композиции и доработана кнопка обновления лаунчера. Следующие важные изменения будут публиковаться здесь.',
    images: ['news-01-update.png']
  },
  '02': {
    title: 'Новые сборки',
    lead: 'В лаунчере появляются отдельные тематические страницы.',
    body: 'Сейчас доступны страницы космической сборки, SCP и Vanilla Minecraft. Каждая страница получает собственный стиль и фоновую музыку. Подробности о будущих серверах и обновлениях будут публиковаться здесь.',
    images: ['news-02-scp.png', 'news-02-vanilla.png']
  }
};
function openNews(id) {
  const item = newsItems[id];
  if (!item) return;
  newsModal.querySelector('.news-modal-number').textContent = id;
  newsModal.querySelector('#newsModalTitle').textContent = item.title;
  newsModal.querySelector('.news-modal-lead').textContent = item.lead;
  newsModal.querySelector('.news-modal-body').textContent = item.body;
  const gallery = newsModal.querySelector('.news-modal-gallery');
  gallery.innerHTML = '';
  item.images.forEach((source) => { const image = document.createElement('img'); image.src = source; image.alt = ''; gallery.append(image); });
  newsModal.hidden = false;
  requestAnimationFrame(() => newsModal.classList.add('is-open'));
  newsModal.querySelector('.news-modal-close').focus();
}
function closeNews() { newsModal.classList.remove('is-open'); window.setTimeout(() => { if (!newsModal.classList.contains('is-open')) newsModal.hidden = true; }, 180); }
launcherHome.querySelectorAll('[data-news]').forEach((card) => {
  card.onclick = () => openNews(card.dataset.news);
  card.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openNews(card.dataset.news); } };
});
newsModal.querySelector('.news-modal-close').onclick = closeNews;
newsModal.onclick = (event) => { if (event.target === newsModal) closeNews(); };
function closeBuildModal() { buildModal.classList.remove('is-open'); window.setTimeout(() => { if (!buildModal.classList.contains('is-open')) buildModal.hidden = true; }, 180); }
function openBuildModal() { buildModal.hidden = false; requestAnimationFrame(() => buildModal.classList.add('is-open')); buildModal.querySelector('.news-modal-close').focus(); }
const mainBuildCard = launcherHome.querySelector('[data-main-build]');
mainBuildCard.onclick = openBuildModal;
mainBuildCard.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openBuildModal(); } };
buildModal.querySelector('.news-modal-close').onclick = closeBuildModal;
buildModal.onclick = (event) => { if (event.target === buildModal) closeBuildModal(); };
buildModal.querySelector('.build-modal-go').onclick = () => { closeBuildModal(); document.querySelector('.page-dot[data-page="1122"]').click(); };
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { if (!newsModal.hidden) closeNews(); if (!buildModal.hidden) closeBuildModal(); } });
const socialLinks = [
  ['.home-social.tiktok', 'Открыть TikTok Baranus Launcher', () => window.launcher.openTikTok()],
  ['.home-social.youtube', 'Открыть YouTube', () => window.launcher.openYouTube()],
  ['.home-social.telegram', 'Открыть Telegram-канал Baranus', () => window.launcher.openTelegram()]
];
launcherHome.querySelector('.home-support-label').onclick = () => window.launcher.openSupport();
socialLinks.forEach(([selector, title, open]) => {
  const link = launcherHome.querySelector(selector);
  link.setAttribute('role', 'link');
  link.setAttribute('tabindex', '0');
  link.setAttribute('title', title);
  link.onclick = open;
  link.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') open(); };
});
const homeNav = document.querySelector('.side-brand');
homeNav.setAttribute('role', 'button');
homeNav.setAttribute('tabindex', '0');
homeNav.setAttribute('title', 'Главное меню');
function showLauncherHome() {
  document.querySelectorAll('.page-dot').forEach((item) => item.classList.remove('active'));
  document.body.dataset.theme = 'main';
  homePage.hidden = true;
  futurePage.hidden = true;
  launcherHome.hidden = false;
  syncPageMusic('main');
}
homeNav.onclick = showLauncherHome;
homeNav.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') showLauncherHome(); };
// Render the launcher menu synchronously. This prevents the previous build
// page from appearing briefly while the main process is loading game state.
showLauncherHome();

// First-launch guide. It is deliberately local to the launcher profile and never
// sends usage data anywhere.
const onboardingKey = 'baranus-onboarding-v1-complete';
const onboarding = document.createElement('section');
onboarding.id = 'onboarding';
onboarding.className = 'onboarding';
onboarding.hidden = true;
onboarding.innerHTML = `<div class="onboarding-spotlight" aria-hidden="true"></div><article class="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboardingTitle"><span class="onboarding-count"></span><h2 id="onboardingTitle"></h2><p></p><div class="onboarding-actions"><button class="onboarding-skip" type="button">ПРОПУСТИТЬ</button><span></span><button class="onboarding-back" type="button">НАЗАД</button><button class="onboarding-next" type="button">ДАЛЕЕ</button></div></article>`;
document.body.append(onboarding);
const onboardingSteps = [
  { selector: '.side-brand', title: 'ГЛАВНОЕ МЕНЮ', text: 'Нажми на букву B, чтобы в любой момент вернуться в главное меню.' },
  { selector: '.page-switches', title: 'СТРАНИЦЫ СБОРОК', text: 'Кружки открывают сборки лаунчера.' },
  { selector: '[data-main-build]', title: 'ОСНОВНАЯ СБОРКА', text: 'Нажми на большую карточку, чтобы прочитать описание космической сборки и перейти к ней.' },
  { selector: '.home-news-column', title: 'НОВОСТИ', text: 'Карточки 01 и 02 открываются — там публикуются подробности обновлений и новых сборок.' },
  { selector: '.home-support-label', title: 'ПОДДЕРЖКА', text: 'Нажми сюда, чтобы открыть Telegram-бот поддержки проекта.' },
  { selector: '.home-socials', title: 'СОЦИАЛЬНЫЕ СЕТИ', text: 'Здесь находятся ссылки на TikTok, YouTube и Telegram-канал проекта.' },
  { selector: '#settings', title: 'НАСТРОЙКИ', text: 'Здесь можно выбрать разрешение окна, полноэкранный режим и поведение лаунчера после запуска Minecraft.' }
];
let onboardingStep = 0;
let onboardingStarted = false;
function finishOnboarding() {
  onboardingStarted = false;
  onboarding.hidden = true;
  localStorage.setItem(onboardingKey, 'true');
}
function renderOnboarding() {
  const step = onboardingSteps[onboardingStep];
  const target = document.querySelector(step.selector);
  if (!target) return finishOnboarding();
  const rect = target.getBoundingClientRect();
  const spot = onboarding.querySelector('.onboarding-spotlight');
  const card = onboarding.querySelector('.onboarding-card');
  const inset = 8;
  spot.style.left = `${Math.max(6, rect.left - inset)}px`;
  spot.style.top = `${Math.max(6, rect.top - inset)}px`;
  spot.style.width = `${rect.width + inset * 2}px`;
  spot.style.height = `${rect.height + inset * 2}px`;
  card.querySelector('.onboarding-count').textContent = `${onboardingStep + 1} / ${onboardingSteps.length}`;
  card.querySelector('h2').textContent = step.title;
  card.querySelector('p').textContent = step.text;
  card.querySelector('.onboarding-back').hidden = onboardingStep === 0;
  card.querySelector('.onboarding-next').textContent = onboardingStep === onboardingSteps.length - 1 ? 'ГОТОВО' : 'ДАЛЕЕ';
  const cardWidth = Math.min(340, window.innerWidth - 32);
  const left = rect.left < window.innerWidth * .48 ? Math.min(window.innerWidth - cardWidth - 16, Math.max(16, rect.right + 22)) : Math.max(16, rect.left - cardWidth - 22);
  const top = Math.max(16, Math.min(window.innerHeight - 210, rect.top + rect.height / 2 - 90));
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}
function startOnboardingIfNeeded() {
  if (onboardingStarted || localStorage.getItem(onboardingKey)) return;
  onboardingStarted = true;
  onboardingStep = 0;
  showLauncherHome();
  onboarding.hidden = false;
  requestAnimationFrame(renderOnboarding);
}
onboarding.querySelector('.onboarding-next').onclick = () => { if (onboardingStep === onboardingSteps.length - 1) return finishOnboarding(); onboardingStep += 1; renderOnboarding(); };
onboarding.querySelector('.onboarding-back').onclick = () => { onboardingStep = Math.max(0, onboardingStep - 1); renderOnboarding(); };
onboarding.querySelector('.onboarding-skip').onclick = finishOnboarding;
window.addEventListener('resize', () => { if (onboardingStarted) renderOnboarding(); });
document.addEventListener('keydown', (event) => { if (onboardingStarted && event.key === 'Escape') finishOnboarding(); });
