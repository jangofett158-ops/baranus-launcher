const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  info: () => ipcRenderer.invoke('game-info'),
  launch: (settings) => ipcRenderer.invoke('launch', settings),
  installJava: () => ipcRenderer.invoke('install-java'),
  installDependencies: () => ipcRenderer.invoke('install-dependencies'),
  installMinecraft: (settings) => ipcRenderer.invoke('install-minecraft', settings),
  setRam: (ramGb) => ipcRenderer.invoke('set-ram', ramGb),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  applyUpdate: () => ipcRenderer.invoke('apply-update'),
  openMods: () => ipcRenderer.invoke('open-mods'),
  openShaders: () => ipcRenderer.invoke('open-shaders'),
  openResourcepacks: () => ipcRenderer.invoke('open-resourcepacks'),
  chooseJava: () => ipcRenderer.invoke('choose-java'),
  onStatus: (callback) => ipcRenderer.on('status', (_, value) => callback(value)),
  onProgress: (callback) => ipcRenderer.on('progress', (_, value) => callback(value)),
  onLog: (callback) => ipcRenderer.on('log', (_, value) => callback(value)),
  onError: (callback) => ipcRenderer.on('launch-error', (_, value) => callback(value)),
  onFinished: (callback) => ipcRenderer.on('finished', (_, value) => callback(value))
});
