const $ = (id) => document.getElementById(id);
const status = $('status');
const log = $('log');
const fill = $('progressFill');
const progressText = $('progressText');
const ram = $('ram');
const ramValue = $('ramValue');
const ramHint = $('ramHint');
const update = $('update');

window.launcher.info().then((info) => {
  status.textContent = info.javaPath ? 'Java 8 готова. Установи Minecraft, затем нажми «Играть».' : 'Сначала установи Java 8.';
  ram.max = info.maxRamGb;
  ram.value = info.ramGb;
  ramValue.textContent = `${info.ramGb} ГБ`;
  ramHint.textContent = `Максимум для этого ПК: ${info.maxRamGb} ГБ`;
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
  try { await window.launcher.installMinecraft({ nickname: $('nickname').value.trim(), ramGb: Number(ram.value) }); }
  catch (_) {} finally { setDisabled(false); }
};
$('play').onclick = async () => {
  setDisabled(true);
  try { await window.launcher.launch({ nickname: $('nickname').value.trim(), ramGb: Number(ram.value) }); }
  catch (_) { /* Detailed error arrives through IPC. */ }
};
