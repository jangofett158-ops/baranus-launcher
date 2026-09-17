const $ = (id) => document.getElementById(id);
// Allow the design preview to work when index.html is opened directly in a
// browser. The real Electron bridge takes precedence in the packaged launcher.
if (!window.launcher) {
  window.launcher = {
    info: async () => ({ maxRamGb: 16, ramGb: 4, nickname: 'Player', version: '0.2.4', contentState: 'install' }),
    setNickname: async (value) => value,
    setRam: async () => {}, mainAction: async () => ({ state: 'ready' }),
    checkUpdate: async () => null, applyUpdate: async () => {},
    openMods: async () => {}, openShaders: async () => {}, openResourcepacks: async () => {}, openTelegram: () => window.open('https://t.me/baranus2', '_blank'),
    onStatus: () => {}, onProgress: () => {}, onLog: () => {}, onError: () => {}, onFinished: () => {}
  };
}
const status = $('status'), log = $('log'), fill = $('progressFill'), progressText = $('progressText');
const ram = $('ram'), ramValue = $('ramValue'), ramHint = $('ramHint'), nickname = $('nickname');
const update = $('update'), version = $('version'), greeting = $('greeting'), settingsPanel = $('settingsPanel');
const nameModal = $('nameModal'), firstNickname = $('firstNickname'), action = $('mainAction');
const actionTitle = $('mainActionTitle'), actionHint = $('mainActionHint');
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
function renderAction(state) { contentState = state; const text = state === 'play' ? ['Играть', 'Запустить Minecraft'] : state === 'sync' ? ['Обновить', 'Проверить и обновить файлы сборки'] : ['Установить', 'Java, Minecraft и сборка']; actionTitle.textContent = text[0]; actionHint.textContent = text[1]; action.classList.toggle('is-play', state === 'play'); action.classList.toggle('is-sync', state === 'sync'); }
async function saveNickname(value) { const name = await window.launcher.setNickname(value); nickname.value = name; showGreeting(name); return name; }
window.launcher.info().then((info) => { ram.max = info.maxRamGb; ram.value = info.ramGb; ramValue.textContent = `${info.ramGb} ГБ`; ramHint.textContent = `Максимум: ${info.maxRamGb} ГБ`; version.textContent = `v${info.version}`; nickname.value = info.nickname; showGreeting(info.nickname); renderAction(info.contentState); status.textContent = info.contentState === 'play' ? 'Сборка готова к запуску.' : info.contentState === 'sync' ? 'Доступно обновление файлов сборки.' : 'Нажми «Установить», чтобы подготовить сборку.'; showLauncherHome(); if (!info.nickname) { nameModal.hidden = false; nameModal.style.display = 'grid'; firstNickname.focus(); } window.launcher.checkUpdate().then((release) => { if (release) { update.hidden = false; update.textContent = `ОБНОВИТЬ ДО ${release.version}`; } }); });
window.launcher.onStatus((message) => status.textContent = message);
window.launcher.onProgress(({ value, indeterminate }) => { fill.style.width = `${Math.max(0, Math.min(100, value || 0))}%`; fill.classList.toggle('indeterminate', Boolean(indeterminate)); progressText.textContent = indeterminate ? 'ПРОВЕРКА…' : `${Math.round(value || 0)}%`; });
window.launcher.onLog((message) => { log.textContent += `${message}\n`; log.scrollTop = log.scrollHeight; });
window.launcher.onError((message) => { status.textContent = `Ошибка: ${message}`; progressText.textContent = 'ОШИБКА'; action.disabled = false; document.querySelector('details').open = true; });
window.launcher.onFinished((code) => { status.textContent = `Игра завершена (код ${code}).`; action.disabled = false; });
$('mods').onclick = () => window.launcher.openMods();
$('shaders').onclick = () => window.launcher.openShaders();
$('resources').onclick = () => window.launcher.openResourcepacks();
$('settings').onclick = () => { settingsPanel.hidden = !settingsPanel.hidden; };
$('firstNicknameSave').onclick = async () => { try { await saveNickname(firstNickname.value); nameModal.hidden = true; nameModal.style.display = 'none'; } catch (error) { status.textContent = `Ошибка: ${error.message}`; } };
firstNickname.onkeydown = (event) => { if (event.key === 'Enter') $('firstNicknameSave').click(); };
nickname.onchange = () => saveNickname(nickname.value).catch((error) => { status.textContent = `Ошибка: ${error.message}`; });
ram.oninput = () => { ramValue.textContent = `${ram.value} ГБ`; }; ram.onchange = () => window.launcher.setRam(Number(ram.value));
update.onclick = async () => { update.disabled = true; try { await window.launcher.applyUpdate(); } catch (error) { status.textContent = `Ошибка обновления: ${error.message}`; update.disabled = false; } };
action.onclick = async () => { const launchedGame = contentState === 'play'; action.disabled = true; try { await saveNickname(nickname.value); const result = await window.launcher.mainAction({ nickname: nickname.value.trim(), ramGb: Number(ram.value) }); if (result?.state === 'ready') { renderAction('play'); status.textContent = result.warning ? 'Не все файлы обновились, но игру можно запустить.' : 'Сборка готова к запуску.'; } } catch (error) { status.textContent = `Ошибка: ${error.message || error}`; progressText.textContent = 'ОШИБКА'; } finally { if (!launchedGame) action.disabled = false; } };

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
    <section class="home-placeholder home-placeholder-large home-feature-card">
      <span class="home-card-tag">ОСНОВНАЯ СБОРКА</span>
      <div><h1>Космическая<br>сборка</h1><span>Minecraft 1.12.2 · Forge</span></div>
    </section>
    <div class="home-news-column">
      <span class="home-news-heading">NEWS</span>
      <section class="home-placeholder home-news-card">
        <span class="home-card-tag">ОБНОВЛЕНИЯ</span>
        <div><p>Новости лаунчера</p><small>Здесь будут появляться важные обновления.</small></div>
        <time>01</time>
      </section>
      <section class="home-placeholder home-news-card">
        <span class="home-card-tag">В РАЗРАБОТКЕ</span>
        <div><p>Новые сборки</p><small>Следите за новостями Baranus Launcher.</small></div>
        <time>02</time>
      </section>
    </div>
  </div>
  <div class="home-support-row">
    <span class="home-support-label">ПОДДЕРЖКА</span>
    <div class="home-socials" aria-label="Социальные сети — заглушки">
      <span class="home-social tiktok" role="img" aria-label="TikTok — заглушка"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18 6v15a5 5 0 1 1-4-5v4a2 2 0 1 0 1 2V6h3c1 4 3 5 6 5v4c-3 0-5-1-6-3" fill="white"/></svg></span>
      <span class="home-social threads" role="img" aria-label="Threads — заглушка"><svg viewBox="0 0 32 32" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M24 10C21 3 8 4 7 14c-2 13 13 16 18 8 4-7-7-12-12-8-4 3 1 8 5 5 3-2 3-12-5-9M19 26c-6 2-12-2-12-9"/></svg></span>
      <span class="home-social youtube" role="img" aria-label="YouTube — заглушка"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m12 8 13 8-13 8Z" fill="white"/></svg></span>
      <span class="home-social telegram" role="img" aria-label="Telegram — заглушка"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 15 26 7l-4 19-7-6-4 4 1-7 10-7-12 6Z" fill="white"/></svg></span>
    </div>
  </div>`;
const homeNewsLabel = document.createElement('span');
homeNewsLabel.className = 'home-news-label';
homeNewsLabel.textContent = 'NEWS';
document.querySelector('.workspace > header').append(homeNewsLabel);
futurePage.before(launcherHome);
const telegramLink = launcherHome.querySelector('.home-social.telegram');
telegramLink.setAttribute('role', 'link');
telegramLink.setAttribute('tabindex', '0');
telegramLink.setAttribute('title', 'Открыть Telegram-канал Baranus');
telegramLink.onclick = () => window.launcher.openTelegram();
telegramLink.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') window.launcher.openTelegram(); };
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
