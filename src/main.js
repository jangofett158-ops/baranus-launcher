const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const os = require('os');
const AdmZip = require('adm-zip');
const { Client, Authenticator } = require('minecraft-launcher-core');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

const GAME_DIR = path.join(app.getPath('documents'), 'Forge-1.12.2');
const MODS_DIR = path.join(GAME_DIR, 'mods');
const SHADERS_DIR = path.join(GAME_DIR, 'shaderpacks');
const RESOURCEPACKS_DIR = path.join(GAME_DIR, 'resourcepacks');
const FORGE_VERSION = '1.12.2-14.23.5.2859';
const RUNTIME_DIR = path.join(GAME_DIR, 'runtime');
const JAVA_EXE = path.join(RUNTIME_DIR, 'bin', 'javaw.exe');
const FORGE_INSTALLER = path.join(GAME_DIR, 'installers', `forge-${FORGE_VERSION}-installer.jar`);
const FORGE_CACHE_MARKER = path.join(GAME_DIR, '.baranus-forge-cache-v2');
const MINECRAFT_INSTALL_MARKER = path.join(GAME_DIR, '.baranus-minecraft-installed-v1');
const DEPENDENCIES_INSTALL_MARKER = path.join(GAME_DIR, '.baranus-dependencies-installed-v1');
const LAUNCHWRAPPER_PATH = path.join(GAME_DIR, 'libraries', 'net', 'minecraft', 'launchwrapper', '1.12', 'launchwrapper-1.12.jar');
const LAUNCHWRAPPER_URL = 'https://libraries.minecraft.net/net/minecraft/launchwrapper/1.12/launchwrapper-1.12.jar';
const LAUNCHWRAPPER_SHA1 = '111e7bea9c968cdb3d06ef4632bf7ff0824d0f36';
const APP_VERSION = require('../package.json').version;
const UPDATE_API = 'https://api.github.com/repos/jangofett158-ops/baranus-launcher/releases/latest';
const SETTINGS_PATH = path.join(GAME_DIR, 'baranus-settings.json');
const MANAGED_FILES_PATH = path.join(GAME_DIR, '.baranus-managed-files.json');
const MAX_RAM_GB = Math.max(1, Math.min(16, Math.floor(os.totalmem() / 1024 ** 3) - 2));
const MODS = [
  { name: 'OptiFine HD U G5', file: 'OptiFine_1.12.2_HD_U_G5.jar', optifine: true },
  { name: 'Galacticraft Legacy 4.0.7', file: 'Galacticraft-1.12.2-4.0.7.jar', url: 'https://www.cursemaven.com/curse/maven/galacticraft-legacy-564236/6364107/galacticraft-legacy-564236-6364107.jar' },
  { name: 'Iron Chests 7.0.72.847', file: 'ironchest-1.12.2-7.0.72.847.jar', url: 'https://www.cursemaven.com/curse/maven/iron-chests-228756/2747935/iron-chests-228756-2747935.jar' },
  { name: 'JEI 4.16.1.302', file: 'jei_1.12.2-4.16.1.302.jar', url: 'https://www.cursemaven.com/curse/maven/jei-238222/3043174/jei-238222-3043174.jar' }
];
const VISUALS = [
  { name: 'BSL Shaders v7.2', file: 'BSL_v7.2.zip', directory: SHADERS_DIR, url: 'https://www.cursemaven.com/curse/maven/bsl-shaders-322506/3037267/bsl-shaders-322506-3037267.jar' },
  { name: 'Faithful 64x для 1.12.2', file: 'Faithful 64x 1.12.2.zip', directory: RESOURCEPACKS_DIR, url: 'https://database.faithfulpack.net/packs/Classic-64x-Jappa-Java/Classic%20Faithful%2064x%20Jappa%20-%201.12.2.zip' }
];
const CONTENT_MANIFEST_URL = 'https://raw.githubusercontent.com/jangofett158-ops/baranus-launcher/main/content-manifest.json';
const DEFAULT_CONTENT_MANIFEST = {
  schema: 1,
  contentVersion: 'built-in-0.2.5',
  assets: [
    { name: 'OptiFine HD U G5', path: 'mods/OptiFine_1.12.2_HD_U_G5.jar', source: 'optifine' },
    ...MODS.filter((mod) => !mod.optifine).map((mod) => ({ name: mod.name, path: `mods/${mod.file}`, url: mod.url })),
    ...VISUALS.map((asset) => ({ name: asset.name, path: `${path.basename(asset.directory)}/${asset.file}`, url: asset.url }))
  ]
};

let window;
let running = false;
let gameRunning = false;
let availableUpdate = null;
let updaterConfigured = false;

function emit(channel, payload) {
  if (!window || window.isDestroyed()) return;
  window.webContents.send(channel, payload);
}

function ensureDirectories() {
  [MODS_DIR, SHADERS_DIR, RESOURCEPACKS_DIR].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch (_) { return {}; }
}

function writeSettings(changes) {
  fs.mkdirSync(GAME_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ ...readSettings(), ...changes }, null, 2));
}

function readManagedFiles() {
  try { return JSON.parse(fs.readFileSync(MANAGED_FILES_PATH, 'utf8')).files || []; }
  catch (_) { return []; }
}

function syncManagedFiles(files) {
  const previous = readManagedFiles();
  const next = files.map((file) => path.resolve(file));
  // Only files that a prior launcher version recorded as managed are removed.
  // Manually added mods and resource packs are never touched.
  for (const file of previous) {
    if (!next.includes(path.resolve(file))) fs.rmSync(file, { force: true });
  }
  fs.writeFileSync(MANAGED_FILES_PATH, JSON.stringify({ files: next }, null, 2));
}

async function getContentState() {
  if (!fs.existsSync(JAVA_EXE) || !fs.existsSync(MINECRAFT_INSTALL_MARKER)) return 'install';
  const manifest = await getContentManifest();
  const settings = readSettings();
  return settings.contentVersion === APP_VERSION && settings.contentManifestVersion === manifest.contentVersion ? 'play' : 'sync';
}

function getRamGb() {
  const saved = Number(readSettings().ramGb);
  if (Number.isInteger(saved) && saved >= 1 && saved <= MAX_RAM_GB) return saved;
  return Math.min(4, MAX_RAM_GB);
}

function saveRamGb(value) {
  const ramGb = Math.max(1, Math.min(MAX_RAM_GB, Math.floor(Number(value) || 4)));
  writeSettings({ ramGb });
  return ramGb;
}

function getNickname() { return String(readSettings().nickname || ''); }

function saveNickname(value) {
  const nickname = String(value || '').trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(nickname)) throw new Error('Имя: 3–16 латинских букв, цифр или _.');
  writeSettings({ nickname });
  return nickname;
}

const WINDOW_RESOLUTIONS = new Set(['960x700', '1280x720', '1600x900', '1920x1080']);
const LAUNCH_BEHAVIORS = new Set(['keep', 'minimize', 'close']);

function getLauncherSettings() {
  const saved = readSettings();
  const resolution = WINDOW_RESOLUTIONS.has(saved.windowResolution) ? saved.windowResolution : '960x700';
  return {
    resolution,
    fullscreen: Boolean(saved.fullscreen),
    launchBehavior: LAUNCH_BEHAVIORS.has(saved.launchBehavior) ? saved.launchBehavior : 'keep'
  };
}

function saveLauncherSettings(changes = {}) {
  const current = getLauncherSettings();
  const next = {
    resolution: WINDOW_RESOLUTIONS.has(changes.resolution) ? changes.resolution : current.resolution,
    fullscreen: typeof changes.fullscreen === 'boolean' ? changes.fullscreen : current.fullscreen,
    launchBehavior: LAUNCH_BEHAVIORS.has(changes.launchBehavior) ? changes.launchBehavior : current.launchBehavior
  };
  writeSettings({ windowResolution: next.resolution, fullscreen: next.fullscreen, launchBehavior: next.launchBehavior });
  if (window && !window.isDestroyed()) {
    const [width, height] = next.resolution.split('x').map(Number);
    if (!window.isFullScreen()) { window.setSize(width, height); window.center(); }
    if (window.isFullScreen() !== next.fullscreen) window.setFullScreen(next.fullscreen);
  }
  return next;
}

function applyLaunchBehavior() {
  if (!window || window.isDestroyed()) return;
  const { launchBehavior } = getLauncherSettings();
  if (launchBehavior === 'minimize') window.minimize();
  if (launchBehavior === 'close') window.close();
}

function fetchBuffer(url, progress) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'Forge-1122-Launcher' } }, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        return resolve(fetchBuffer(new URL(response.headers.location, url).toString(), progress));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`Не удалось скачать Java (HTTP ${response.statusCode}).`));
      }
      const chunks = [];
      const total = Number(response.headers['content-length']) || 0;
      let received = 0;
      response.on('data', (chunk) => { chunks.push(chunk); received += chunk.length; progress?.(received, total); });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    // A blocked mod host must not leave the main button disabled forever.
    request.setTimeout(20000, () => request.destroy(new Error('Сервер загрузки не ответил за 20 секунд.')));
    request.on('error', reject);
  });
}

function validateContentManifest(manifest) {
  if (!manifest || manifest.schema !== 1 || typeof manifest.contentVersion !== 'string' || !Array.isArray(manifest.assets) || !manifest.assets.length) {
    throw new Error('Неверный формат content-manifest.json.');
  }
  for (const asset of manifest.assets) {
    if (!asset || typeof asset.name !== 'string' || typeof asset.path !== 'string' || (!asset.url && asset.source !== 'optifine')) {
      throw new Error('В content-manifest.json есть неполное описание файла.');
    }
  }
  return manifest;
}

async function getContentManifest() {
  try {
    const manifest = JSON.parse((await fetchBuffer(CONTENT_MANIFEST_URL)).toString('utf8'));
    return validateContentManifest(manifest);
  } catch (error) {
    emit('log', `Не удалось загрузить удалённый manifest сборки: ${error.message || error}. Используем встроенный список.`);
    return DEFAULT_CONTENT_MANIFEST;
  }
}

function getContentTarget(relativePath) {
  const normalized = String(relativePath).replaceAll('\\', '/');
  if (!/^(mods|config|shaderpacks|resourcepacks)\/.+/.test(normalized)) throw new Error(`Недопустимый путь в manifest: ${relativePath}`);
  const target = path.resolve(GAME_DIR, normalized);
  if (!target.startsWith(`${path.resolve(GAME_DIR)}${path.sep}`)) throw new Error(`Небезопасный путь в manifest: ${relativePath}`);
  return target;
}

async function resolveContentUrl(asset) {
  if (asset.source === 'optifine') {
    const page = (await fetchBuffer('https://optifine.net/adloadx?f=OptiFine_1.12.2_HD_U_G5.jar')).toString('utf8');
    const match = page.match(/href=['"](downloadx\?f=OptiFine_1\.12\.2_HD_U_G5\.jar(?:&amp;|&)x=[a-f0-9]+)['"]/i);
    if (!match) throw new Error('Официальный сайт OptiFine не выдал ссылку на скачивание.');
    return `https://optifine.net/${match[1].replace('&amp;', '&')}`;
  }
  const url = new URL(asset.url);
  if (url.protocol !== 'https:') throw new Error(`Разрешены только HTTPS-ссылки: ${asset.name}`);
  return url.toString();
}

function hasValidContentAsset(target, sha256) {
  if (!fs.existsSync(target)) return false;
  if (!sha256) return fs.statSync(target).size > 1000;
  const actual = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  return actual.toLowerCase() === String(sha256).toLowerCase();
}

async function installContentManifest(manifest) {
  const installed = [];
  for (let index = 0; index < manifest.assets.length; index++) {
    const asset = manifest.assets[index];
    const target = getContentTarget(asset.path);
    installed.push(target);
    if (hasValidContentAsset(target, asset.sha256)) continue;
    emit('status', `Скачиваем ${asset.name} (${index + 1}/${manifest.assets.length})…`);
    const url = await resolveContentUrl(asset);
    const data = await fetchBuffer(url, (received, total) => {
      const part = total ? received / total : 0;
      emit('progress', { value: 20 + ((index + part) / manifest.assets.length) * 25, indeterminate: !total });
    });
    if (asset.sha256) {
      const actual = crypto.createHash('sha256').update(data).digest('hex');
      if (actual.toLowerCase() !== String(asset.sha256).toLowerCase()) throw new Error(`Не совпал SHA-256 файла: ${asset.name}`);
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(`${target}.download`, data);
    fs.renameSync(`${target}.download`, target);
  }
  syncManagedFiles(installed);
  return manifest.contentVersion;
}

function compareVersions(a, b) {
  const left = String(a).replace(/^v/, '').split('.').map(Number);
  const right = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] || 0) - (right[i] || 0);
    if (difference) return difference;
  }
  return 0;
}

function isPortableBuild() {
  return Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
}

function configureInstallerUpdater() {
  if (updaterConfigured) return;
  updaterConfigured = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on('download-progress', (progress) => {
    emit('progress', { value: progress.percent || 0, indeterminate: false });
  });
}

async function checkPortableUpdate() {
  try {
    const release = JSON.parse((await fetchBuffer(UPDATE_API)).toString('utf8'));
    // Prefer the installer: it can update safely even when the launcher lives
    // in Program Files. Keep the portable asset as a fallback for old releases.
    const asset = release.assets?.find((item) => /^Baranus-Launcher-Setup-.*\.exe$/i.test(item.name)) ||
      release.assets?.find((item) => item.name === 'Baranus-Launcher.exe');
    if (!asset || !release.tag_name || compareVersions(release.tag_name, APP_VERSION) <= 0) return null;
    availableUpdate = {
      version: String(release.tag_name).replace(/^v/, ''),
      url: asset.browser_download_url,
      installer: /^Baranus-Launcher-Setup-.*\.exe$/i.test(asset.name),
      notes: release.body || ''
    };
    return availableUpdate;
  } catch (_) {
    return null;
  }
}

async function checkForUpdate() {
  // NSIS installations use electron-updater. It understands GitHub release
  // metadata, checks hashes, and replaces files after the application exits.
  if (app.isPackaged && !isPortableBuild()) {
    try {
      configureInstallerUpdater();
      const result = await autoUpdater.checkForUpdates();
      const info = result?.updateInfo;
      if (!info?.version || compareVersions(info.version, APP_VERSION) <= 0) return null;
      availableUpdate = { version: info.version, installerUpdater: true };
      return availableUpdate;
    } catch (_) {
      // A manual GitHub release without latest.yml can still use the direct
      // installer download below instead of silently disabling updates.
    }
  }
  return checkPortableUpdate();
}

async function applyUpdate() {
  if (!availableUpdate) throw new Error('Обновление не найдено. Нажми «Проверить обновления».');
  emit('status', `Скачиваем Baranus Launcher ${availableUpdate.version}…`);
  if (availableUpdate.installerUpdater) {
    configureInstallerUpdater();
    await autoUpdater.downloadUpdate();
    emit('status', 'Обновление скачано. Перезапускаем лаунчер…');
    autoUpdater.quitAndInstall(false, true);
    return;
  }
  const suffix = availableUpdate.installer ? 'Setup' : 'Portable';
  const updateFile = path.join(app.getPath('temp'), `Baranus-Launcher-${suffix}-${availableUpdate.version}.exe`);
  const data = await fetchBuffer(availableUpdate.url, (received, total) => emit('progress', { value: total ? (received / total) * 100 : 0, indeterminate: !total }));
  if (data.subarray(0, 2).toString('ascii') !== 'MZ') throw new Error('Файл обновления повреждён.');
  fs.writeFileSync(updateFile, data);
  const scriptPath = path.join(app.getPath('temp'), `baranus-update-${Date.now()}.cmd`);
  let script;
  if (availableUpdate.installer) {
    // Start the installer only after Electron releases its own executable.
    script = `@echo off\r\ntimeout /t 2 /nobreak >nul\r\nstart "" "${updateFile}"\r\ndel "%~f0"\r\n`;
  } else {
    // Compatibility path for portable builds. Retry because Windows can keep
    // the old executable locked for a few seconds after app.quit().
    const currentExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    script = `@echo off\r\nset "SOURCE=${updateFile}"\r\nset "TARGET=${currentExe}"\r\nfor /L %%i in (1,1,12) do (\r\ntimeout /t 1 /nobreak >nul\r\ncopy /y "%SOURCE%" "%TARGET%" >nul && goto started\r\n)\r\nstart "" "%SOURCE%"\r\ngoto cleanup\r\n:started\r\nstart "" "%TARGET%"\r\n:cleanup\r\ndel "%~f0"\r\n`;
  }
  fs.writeFileSync(scriptPath, script, 'utf8');
  spawn('cmd.exe', ['/c', scriptPath], { detached: true, stdio: 'ignore' }).unref();
  app.quit();
}

async function installMods() {
  for (let i = 0; i < MODS.length; i++) {
    const mod = MODS[i];
    const target = path.join(MODS_DIR, mod.file);
    if (fs.existsSync(target) && fs.statSync(target).size > 1000) continue;
    emit('status', `Скачиваем мод ${i + 1}/${MODS.length}: ${mod.name}`);
    let downloadUrl = mod.url;
    if (mod.optifine) {
      const page = (await fetchBuffer('https://optifine.net/adloadx?f=OptiFine_1.12.2_HD_U_G5.jar')).toString('utf8');
      const match = page.match(/href=['"](downloadx\?f=OptiFine_1\.12\.2_HD_U_G5\.jar(?:&amp;|&)x=[a-f0-9]+)['"]/i);
      if (!match) throw new Error('Официальный сайт OptiFine не выдал ссылку на скачивание.');
      downloadUrl = `https://optifine.net/${match[1].replace('&amp;', '&')}`;
    }
    const data = await fetchBuffer(downloadUrl, (received, total) => {
      const filePart = total ? received / total : 0;
      emit('progress', { value: 20 + ((i + filePart) / MODS.length) * 15, indeterminate: !total });
    });
    fs.writeFileSync(`${target}.download`, data);
    fs.renameSync(`${target}.download`, target);
  }
  emit('progress', { value: 35, indeterminate: false });
}

async function installVisuals() {
  for (let i = 0; i < VISUALS.length; i++) {
    const asset = VISUALS[i];
    const target = path.join(asset.directory, asset.file);
    if (fs.existsSync(target) && fs.statSync(target).size > 1000) continue;
    emit('status', `Скачиваем ${asset.name}…`);
    const data = await fetchBuffer(asset.url, (received, total) => {
      const part = total ? received / total : 0;
      emit('progress', { value: 35 + ((i + part) / VISUALS.length) * 10, indeterminate: !total });
    });
    fs.writeFileSync(`${target}.download`, data);
    fs.renameSync(`${target}.download`, target);
  }
  emit('progress', { value: 45, indeterminate: false });
}

async function getForgeInstaller() {
  if (fs.existsSync(FORGE_INSTALLER) && fs.statSync(FORGE_INSTALLER).size > 100000) return FORGE_INSTALLER;
  fs.mkdirSync(path.dirname(FORGE_INSTALLER), { recursive: true });
  emit('status', 'Скачиваем установщик Forge 1.12.2…');
  const url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${FORGE_VERSION}/forge-${FORGE_VERSION}-installer.jar`;
  const data = await fetchBuffer(url, (received, total) => emit('progress', { value: total ? 35 + (received / total) * 10 : 35, indeterminate: !total }));
  fs.writeFileSync(`${FORGE_INSTALLER}.download`, data);
  fs.renameSync(`${FORGE_INSTALLER}.download`, FORGE_INSTALLER);
  return FORGE_INSTALLER;
}

async function ensureLaunchWrapper() {
  const valid = fs.existsSync(LAUNCHWRAPPER_PATH) &&
    crypto.createHash('sha1').update(fs.readFileSync(LAUNCHWRAPPER_PATH)).digest('hex') === LAUNCHWRAPPER_SHA1;
  if (valid) return;
  emit('status', 'Скачиваем библиотеку запуска Minecraft…');
  fs.mkdirSync(path.dirname(LAUNCHWRAPPER_PATH), { recursive: true });
  const data = await fetchBuffer(LAUNCHWRAPPER_URL, (received, total) => emit('progress', { value: total ? 45 + (received / total) * 5 : 45, indeterminate: !total }));
  const hash = crypto.createHash('sha1').update(data).digest('hex');
  if (hash !== LAUNCHWRAPPER_SHA1) throw new Error('Не удалось проверить библиотеку запуска Minecraft.');
  fs.writeFileSync(LAUNCHWRAPPER_PATH, data);
}

async function installDependencies() {
  ensureDirectories();
  emit('status', 'Устанавливаем зависимости сборки…');
  const manifest = await getContentManifest();
  const contentManifestVersion = await installContentManifest(manifest);
  await getForgeInstaller();
  await ensureLaunchWrapper();
  writeSettings({ contentManifestVersion });
  fs.writeFileSync(DEPENDENCIES_INSTALL_MARKER, 'Forge, mods, OptiFine and visual packs were installed by Baranus Launcher.');
  emit('progress', { value: 100, indeterminate: false });
  emit('status', 'Зависимости установлены. Теперь установи Minecraft.');
}

async function runMainAction(nickname, ramGb) {
  const state = await getContentState();
  if (state === 'play') {
    if (gameRunning) throw new Error('Minecraft уже запущен.');
    await prepareMinecraft(nickname, true, saveRamGb(ramGb));
    return { state: 'launched' };
  }
  if (state === 'install') {
    emit('status', 'Подготавливаем Baranus Launcher: Java, Minecraft и сборка…');
    await getBundledJava();
    await installDependencies();
    await prepareMinecraft(nickname, false, saveRamGb(ramGb));
  } else {
    // Minecraft is already installed. Re-running the legacy 1.12.2 installer
    // here could freeze the button on some PCs, so sync only managed content.
    // A temporarily unavailable mod host must not prevent a working game from
    // being launched after a launcher update.
    emit('status', 'Проверяем и обновляем файлы сборки…');
    try {
      await installDependencies();
    } catch (error) {
      const message = error.message || String(error);
      emit('log', `Синхронизация не завершена: ${message}`);
      writeSettings({ contentVersion: APP_VERSION });
      emit('status', 'Часть файлов не обновилась, но игру можно запустить.');
      return { state: 'ready', contentState: 'play', warning: message };
    }
  }
  writeSettings({ contentVersion: APP_VERSION });
  emit('status', state === 'install' ? 'Сборка установлена. Теперь можно играть.' : 'Файлы сборки обновлены. Теперь можно играть.');
  return { state: 'ready', contentState: 'play' };
}

async function prepareMinecraft(nickname, startAfterInstall = true, ramGb = getRamGb()) {
  if (!fs.existsSync(JAVA_EXE)) throw new Error('Сначала нажми «Установить Java 8».');
  const javaPath = JAVA_EXE;
  const forgeInstaller = FORGE_INSTALLER;
  if (!fs.existsSync(FORGE_CACHE_MARKER)) {
    const forgeCache = path.join(GAME_DIR, 'forge', '1.12.2');
    if (fs.existsSync(forgeCache)) fs.rmSync(forgeCache, { recursive: true, force: true });
    fs.writeFileSync(FORGE_CACHE_MARKER, 'Forge cache generated with a local installer.');
  }
  emit('status', 'Проверяем и скачиваем Minecraft…');
  emit('progress', { value: 45, indeterminate: true });
  const launcher = new Client();
  launcher.on('debug', (message) => emit('log', String(message)));
  launcher.on('data', (message) => emit('log', String(message)));
  let finishGame;
  if (startAfterInstall) {
    launcher.on('close', (code) => finishGame?.(code));
  } else {
    // MCLC uses its normal dependency downloader, but we replace only the final
    // Java process spawn so the Install button never starts Minecraft.
    launcher.startMinecraft = () => ({ installed: true });
  }
  const gameProcess = await launcher.launch({
    authorization: Authenticator.getAuth(nickname), root: GAME_DIR, javaPath,
    version: { number: '1.12.2', type: 'release' }, forge: forgeInstaller,
    memory: { max: `${ramGb}G`, min: '1G' }
  });
  if (!gameProcess) throw new Error('Minecraft не удалось установить или запустить. Открой журнал запуска.');
  emit('progress', { value: 100, indeterminate: false });
  if (!startAfterInstall) fs.writeFileSync(MINECRAFT_INSTALL_MARKER, 'Minecraft and Forge were installed by Baranus Launcher.');
  emit('status', startAfterInstall ? 'Minecraft запущен.' : 'Minecraft установлен.');
  if (startAfterInstall) {
    // minecraft-launcher-core may not always forward its own `close` event.
    // Listen to the real child process as well, so the launcher never remains
    // locked after a game has exited.
    gameRunning = true;
    finishGame = (code) => {
      if (!gameRunning) return;
      gameRunning = false;
      running = false;
      emit('finished', code ?? 0);
    };
    gameProcess.once?.('close', finishGame);
    gameProcess.once?.('error', () => finishGame(1));
    applyLaunchBehavior();
  }
}

async function getBundledJava() {
  if (fs.existsSync(JAVA_EXE)) return JAVA_EXE;
  emit('status', 'Скачиваем Java 8 — это нужно только один раз…');
  const api = 'https://api.adoptium.net/v3/assets/latest/8/hotspot?architecture=x64&image_type=jre&os=windows&package_type=jre';
  const releases = JSON.parse((await fetchBuffer(api)).toString('utf8'));
  const asset = releases[0]?.binary?.package?.link;
  if (!asset) throw new Error('Не удалось получить официальный пакет Java 8.');
  const archive = await fetchBuffer(asset, (received, total) => emit('progress', { value: total ? (received / total) * 20 : 0, indeterminate: !total }));
  emit('status', 'Распаковываем Java 8…');
  const staging = path.join(GAME_DIR, '.runtime-tmp');
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  new AdmZip(archive).extractAllTo(staging, true);
  const entries = fs.readdirSync(staging);
  const extractedRoot = entries.length === 1 ? path.join(staging, entries[0]) : staging;
  fs.rmSync(RUNTIME_DIR, { recursive: true, force: true });
  fs.renameSync(extractedRoot, RUNTIME_DIR);
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  if (!fs.existsSync(JAVA_EXE)) throw new Error('Java 8 скачалась, но javaw.exe не найден.');
  emit('progress', { value: 20, indeterminate: false });
  return JAVA_EXE;
}

function createWindow() {
  const preferences = getLauncherSettings();
  const [width, height] = preferences.resolution.split('x').map(Number);
  window = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 650,
    resizable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  window.removeMenu();
  if (preferences.fullscreen) window.setFullScreen(true);
  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => { ensureDirectories(); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('game-info', async () => ({ gameDir: GAME_DIR, modsDir: MODS_DIR, shadersDir: SHADERS_DIR, resourcepacksDir: RESOURCEPACKS_DIR, forge: FORGE_VERSION, javaPath: fs.existsSync(JAVA_EXE) ? JAVA_EXE : '', ramGb: getRamGb(), maxRamGb: MAX_RAM_GB, nickname: getNickname(), version: APP_VERSION, contentState: await getContentState(), launcherSettings: getLauncherSettings() }));
ipcMain.handle('set-launcher-settings', (_event, changes) => saveLauncherSettings(changes));
ipcMain.handle('check-update', () => checkForUpdate());
ipcMain.handle('apply-update', () => applyUpdate());
ipcMain.handle('set-ram', (_event, ramGb) => saveRamGb(ramGb));
ipcMain.handle('set-nickname', (_event, nickname) => saveNickname(nickname));
ipcMain.handle('open-mods', () => { ensureDirectories(); return shell.openPath(MODS_DIR); });
ipcMain.handle('open-shaders', () => { ensureDirectories(); return shell.openPath(SHADERS_DIR); });
ipcMain.handle('open-resourcepacks', () => { ensureDirectories(); return shell.openPath(RESOURCEPACKS_DIR); });
ipcMain.handle('open-telegram', () => shell.openExternal('https://t.me/baranus2'));
ipcMain.handle('install-java', async () => {
  if (running) throw new Error('Дождись завершения текущей операции.');
  running = true;
  try { await getBundledJava(); emit('status', 'Java 8 установлена и готова.'); }
  catch (error) { emit('launch-error', error.message || String(error)); throw error; }
  finally { running = false; }
});
ipcMain.handle('install-dependencies', async () => {
  if (running) throw new Error('Дождись завершения текущей операции.');
  running = true;
  try { await installDependencies(); }
  catch (error) { emit('launch-error', error.message || String(error)); throw error; }
  finally { running = false; }
});
ipcMain.handle('install-minecraft', async (_event, { nickname, ramGb }) => {
  if (running) throw new Error('Дождись завершения текущей операции.');
  if (!/^[A-Za-z0-9_]{3,16}$/.test(nickname || '')) throw new Error('Ник: 3–16 латинских букв, цифр или _.');
  running = true;
  try { await prepareMinecraft(nickname, false, saveRamGb(ramGb)); }
  catch (error) { emit('launch-error', error.message || String(error)); throw error; }
  finally { running = false; }
});
ipcMain.handle('main-action', async (_event, { nickname, ramGb }) => {
  if (running || gameRunning) throw new Error(gameRunning ? 'Minecraft уже запущен.' : 'Дождись завершения текущей операции.');
  if (!/^[A-Za-z0-9_]{3,16}$/.test(nickname || '')) throw new Error('Ник: 3–16 латинских букв, цифр или _.');
  running = true;
  try { return await runMainAction(nickname, ramGb); }
  catch (error) { emit('launch-error', error.message || String(error)); throw error; }
  finally { running = false; }
});
ipcMain.handle('choose-java', async () => {
  const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'Java', extensions: ['exe'] }] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('launch', async (_event, { nickname, ramGb }) => {
  if (running) throw new Error('Игра уже запускается.');
  if (!/^[A-Za-z0-9_]{3,16}$/.test(nickname || '')) {
    throw new Error('Ник должен состоять из 3–16 латинских букв, цифр или _.');
  }
  if (!fs.existsSync(JAVA_EXE)) throw new Error('Сначала нажми «Установить Java 8».');
  if (!fs.existsSync(MINECRAFT_INSTALL_MARKER)) throw new Error('Сначала нажми «Установить Minecraft».');
  running = true;
  ensureDirectories();
  try {
    await prepareMinecraft(nickname, true, saveRamGb(ramGb));
  } catch (error) {
    running = false;
    emit('launch-error', error.message || String(error));
    throw error;
  }
});
