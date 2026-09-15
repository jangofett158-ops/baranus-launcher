const $ = (id) => document.getElementById(id);
// Allow the design preview to work when index.html is opened directly in a
// browser. The real Electron bridge takes precedence in the packaged launcher.
if (!window.launcher) {
  window.launcher = {
    info: async () => ({ maxRamGb: 16, ramGb: 4, nickname: 'Player', version: '0.2.4', contentState: 'install' }),
    setNickname: async (value) => value,
    setRam: async () => {}, mainAction: async () => ({ state: 'ready' }),
    checkUpdate: async () => null, applyUpdate: async () => {},
    openMods: async () => {}, openShaders: async () => {}, openResourcepacks: async () => {},
    onStatus: () => {}, onProgress: () => {}, onLog: () => {}, onError: () => {}, onFinished: () => {}
  };
}
const status = $('status'), log = $('log'), fill = $('progressFill'), progressText = $('progressText');
const ram = $('ram'), ramValue = $('ramValue'), ramHint = $('ramHint'), nickname = $('nickname');
const update = $('update'), version = $('version'), greeting = $('greeting'), settingsPanel = $('settingsPanel');
const nameModal = $('nameModal'), firstNickname = $('firstNickname'), action = $('mainAction');
const actionTitle = $('mainActionTitle'), actionHint = $('mainActionHint');
let contentState = 'install';
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
const futurePageText = $('futurePageText');
document.querySelectorAll('.page-dot').forEach((dot) => {
  dot.onclick = () => {
    const isHome = dot.dataset.page === '1122';
    document.querySelectorAll('.page-dot').forEach((item) => item.classList.toggle('active', item === dot));
    launcherHome.hidden = true;
    document.body.dataset.theme = isHome ? 'space' : dot.dataset.page;
    homePage.hidden = !isHome;
    futurePage.hidden = isHome;
    if (!isHome) futurePageText.textContent = dot.dataset.page === '1165a'
      ? 'Первая страница Minecraft 1.16.5 Forge. Здесь будет отдельная сборка.'
      : 'Вторая страница Minecraft 1.16.5 Forge. Здесь будет отдельная сборка.';
  };
});

// The B mark is the launcher-wide home navigation, separate from game builds.
const launcherHome = document.createElement('section');
launcherHome.id = 'mainMenuPage';
launcherHome.className = 'main-menu-page';
launcherHome.hidden = true;
launcherHome.innerHTML = '<div class="main-menu-intro"><p class="eyebrow">BARANUS LAUNCHER</p><h1>Главное<br>меню</h1><p>Здесь появятся разделы и возможности лаунчера.</p></div>';
futurePage.before(launcherHome);
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
}
homeNav.onclick = showLauncherHome;
homeNav.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') showLauncherHome(); };
