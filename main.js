const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.setName('PetFlow')

function garantirDados() {
  let dataDir
  if (app.isPackaged) {
    dataDir = path.join(app.getPath('userData'), 'data')
  } else {
    dataDir = path.join(__dirname, 'data')
  }

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const arquivos = [
    'clientes.json',
    'animais.json',
    'produtos.json',
    'servicos.json',
    'fornecedores.json',
    'agenda.json',
    'caixa.json'
  ]

  arquivos.forEach((arq) => {
    const p = path.join(dataDir, arq)
    if (!fs.existsSync(p)) fs.writeFileSync(p, '[]', 'utf8')
  })

  global.DATA_DIR = dataDir
}

function createWindow() {
  garantirDados()

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 980,
    minHeight: 640,
    title: 'PetFlow',
    autoHideMenuBar: true,
    backgroundColor: '#0f1117',
    titleBarStyle: process.platform === 'win32' ? 'hidden' : 'default',
    titleBarOverlay: process.platform === 'win32'
      ? {
          color: '#111827',
          symbolColor: '#e8eaf0',
          height: 32
        }
      : false,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      contextIsolation: false,
      webSecurity: false,
      additionalArguments: ['--data-dir=' + global.DATA_DIR]
    }
  })

  win.setMenuBarVisibility(false)
  win.loadFile('index.html')
  win.on('page-title-updated', (e) => e.preventDefault())
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
