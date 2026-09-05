const $ = (id) => document.getElementById(id);
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
window.launcher.info().then((info) => { ram.max = info.maxRamGb; ram.value = info.ramGb; ramValue.textContent = `${info.ramGb} ГБ`; ramHint.textContent = `Максимум: ${info.maxRamGb} ГБ`; version.textContent = `v${info.version}`; nickname.value = info.nickname; showGreeting(info.nickname); renderAction(info.contentState); status.textContent = info.contentState === 'play' ? 'Сборка готова к запуску.' : info.contentState === 'sync' ? 'Доступно обновление файлов сборки.' : 'Нажми «Установить», чтобы подготовить сборку.'; if (!info.nickname) { nameModal.hidden = false; nameModal.style.display = 'grid'; firstNickname.focus(); } window.launcher.checkUpdate().then((release) => { if (release) { update.hidden = false; update.textContent = `ОБНОВИТЬ ДО ${release.version}`; } }); });
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
action.onclick = async () => { const launchedGame = contentState === 'play'; action.disabled = true; try { await saveNickname(nickname.value); const result = await window.launcher.mainAction({ nickname: nickname.value.trim(), ramGb: Number(ram.value) }); if (result?.state === 'ready') renderAction('play'); } catch (_) {} finally { if (!launchedGame) action.disabled = false; } };
