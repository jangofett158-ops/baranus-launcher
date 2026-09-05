const $ = (id) => document.getElementById(id);
const status = $('status');
const log = $('log');
const fill = $('progressFill');
const progressText = $('progressText');
const ram = $('ram');
const ramValue = $('ramValue');
const ramHint = $('ramHint');
const update = $('update');
const version = $('version');
const nickname = $('nickname');
const greeting = $('greeting');
const settingsPanel = $('settingsPanel');
const nameModal = $('nameModal');
const firstNickname = $('firstNickname');

nameModal.style.display = 'none';

function showGreeting(name) { greeting.textContent = name ? `Добро пожаловать, ${name}!` : 'Добро пожаловать!'; }
async function saveNickname(value) {
  const name = await window.launcher.setNickname(value);
  nickname.value = name;
  showGreeting(name);
  return name;
}

window.launcher.info().then((info) => {
  status.textContent = info.javaPath ? 'Java 8 готова. Установи Minecraft, затем нажми «Играть».' : 'Сначала установи Java 8.';
  ram.max = info.maxRamGb;
  ram.value = info.ramGb;
  ramValue.textContent = `${info.ramGb} ГБ`;
  ramHint.textContent = `Максимум для этого ПК: ${info.maxRamGb} ГБ`;
  version.textContent = `v${info.version}`;
  nickname.value = info.nickname;
  showGreeting(info.nickname);
  if (!info.nickname) { nameModal.hidden = false; nameModal.style.display = 'grid'; firstNickname.focus(); }
  window.launcher.checkUpdate().then((release) => {
    if (!release) return;
    update.hidden = false;
    update.textContent = `Обновить до ${release.version}`;
  });
});
window.launcher.onStatus((message) => status.textContent = message);
window.launcher.onProgress(({ value, indeterminate }) => {
  fill.style.width = `${Math.max(0, Math.min(100, value || 0))}%`;
  fill.classList.toggle('indeterminate', Boolean(indeterminate));
  progressText.textContent = indeterminate ? 'Загрузка Minecraft и Forge…' : `${Math.round(value || 0)}%`;
});
window.launcher.onLog((message) => { log.textContent += `${message}\n`; log.scrollTop = log.scrollHeight; });
function setDisabled(value) { ['java', 'minecraft', 'play'].forEach((id) => $(id).disabled = value); }
window.launcher.onError((message) => { status.textContent = `Ошибка: ${message}`; progressText.textContent = 'Установка остановлена'; document.querySelector('details').open = true; setDisabled(false); });
window.launcher.onFinished((code) => { status.textContent = `Игра завершена (код ${code}).`; setDisabled(false); });

$('mods').onclick = () => window.launcher.openMods();
$('shaders').onclick = () => window.launcher.openShaders();
$('resources').onclick = () => window.launcher.openResourcepacks();
$('settings').onclick = () => { settingsPanel.hidden = !settingsPanel.hidden; };
$('firstNicknameSave').onclick = async () => { try { await saveNickname(firstNickname.value); nameModal.hidden = true; nameModal.style.display = 'none'; } catch (error) { status.textContent = `Ошибка: ${error.message}`; } };
firstNickname.onkeydown = (event) => { if (event.key === 'Enter') $('firstNicknameSave').click(); };
nickname.onchange = () => saveNickname(nickname.value).catch((error) => { status.textContent = `Ошибка: ${error.message}`; });
update.onclick = async () => {
  update.disabled = true;
  try { await window.launcher.applyUpdate(); }
  catch (error) { status.textContent = `Ошибка обновления: ${error.message}`; update.disabled = false; }
};
ram.oninput = () => { ramValue.textContent = `${ram.value} ГБ`; };
ram.onchange = () => window.launcher.setRam(Number(ram.value));
$('java').onclick = async () => {
  setDisabled(true);
  try { await window.launcher.installJava(); status.textContent = 'Java 8 установлена. Теперь выбери шаг 02.'; }
  catch (_) {} finally { setDisabled(false); }
};
$('minecraft').onclick = async () => {
  setDisabled(true);
  try { await saveNickname(nickname.value); await window.launcher.installMinecraft({ nickname: nickname.value.trim(), ramGb: Number(ram.value) }); }
  catch (_) {} finally { setDisabled(false); }
};
$('play').onclick = async () => {
  setDisabled(true);
  try { await saveNickname(nickname.value); await window.launcher.launch({ nickname: nickname.value.trim(), ramGb: Number(ram.value) }); }
  catch (_) { /* Detailed error arrives through IPC. */ }
};
