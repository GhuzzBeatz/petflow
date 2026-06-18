const __req = (() => {
  try {
    if (typeof require === 'function') return require
  } catch (e) {}
  try {
    if (typeof window !== 'undefined' && window.parent && typeof window.parent.require === 'function') {
      return window.parent.require
    }
  } catch (e) {}
  return null
})()

const fs = __req ? __req('fs') : null
const path = __req ? __req('path') : null

const __proc = (() => {
  try {
    if (typeof process !== 'undefined') return process
  } catch (e) {}
  try {
    if (typeof window !== 'undefined' && window.parent && window.parent.process) return window.parent.process
  } catch (e) {}
  return null
})()

function argDataDir(procRef) {
  try {
    if (!procRef || !Array.isArray(procRef.argv)) return ''
    const arg = procRef.argv.find((a) => String(a || '').startsWith('--data-dir='))
    return arg ? String(arg).replace('--data-dir=', '') : ''
  } catch (e) {
    return ''
  }
}

function getDataDir() {
  if (!fs || !path) return '__LOCALSTORAGE__'

  const candidatos = []
  const procAtual = __proc
  let procPai = null
  try {
    if (typeof window !== 'undefined' && window.parent && window.parent.process) {
      procPai = window.parent.process
    }
  } catch (e) {}

  const argAtual = argDataDir(procAtual)
  const argPai = argDataDir(procPai)
  if (argAtual) candidatos.push(argAtual)
  if (argPai) candidatos.push(argPai)

  try {
    if (procAtual && procAtual.env && procAtual.env.PETFLOW_DATA_DIR) {
      candidatos.push(procAtual.env.PETFLOW_DATA_DIR)
    }
  } catch (e) {}
  try {
    if (procPai && procPai.env && procPai.env.PETFLOW_DATA_DIR) {
      candidatos.push(procPai.env.PETFLOW_DATA_DIR)
    }
  } catch (e) {}

  const appData = (() => {
    try {
      if (procAtual && procAtual.env && procAtual.env.APPDATA) return procAtual.env.APPDATA
    } catch (e) {}
    try {
      if (procPai && procPai.env && procPai.env.APPDATA) return procPai.env.APPDATA
    } catch (e) {}
    return ''
  })()

  if (appData) {
    candidatos.push(path.join(appData, 'petflow', 'data'))
    candidatos.push(path.join(appData, 'PetFlow', 'data'))
  }

  if (typeof __dirname !== 'undefined') {
    candidatos.push(path.join(__dirname, '..', 'data'))
  }

  for (const dir of candidatos) {
    try {
      if (!dir) continue
      fs.mkdirSync(dir, { recursive: true })
      return dir
    } catch (e) {}
  }

  return typeof __dirname !== 'undefined'
    ? path.join(__dirname, '..', 'data')
    : '__LOCALSTORAGE__'
}

const DATA_DIR = getDataDir()
window.__PETFLOW_DATA_DIR = DATA_DIR

function lsKey(nome) {
  return `@PETFLOW:FILE:${nome}`
}

function lerArq(nome) {
  if (!fs || !path || DATA_DIR === '__LOCALSTORAGE__') {
    try {
      const raw = localStorage.getItem(lsKey(nome)) || '[]'
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  }

  const p = path.join(DATA_DIR, nome)
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(p)) fs.writeFileSync(p, '[]', 'utf8')
    return JSON.parse(fs.readFileSync(p, 'utf8').trim() || '[]')
  } catch (e) {
    return []
  }
}

function salvarArq(nome, dados) {
  if (!fs || !path || DATA_DIR === '__LOCALSTORAGE__') {
    try {
      localStorage.setItem(lsKey(nome), JSON.stringify(dados || []))
    } catch (e) {}
    return
  }

  const p = path.join(DATA_DIR, nome)
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(p, JSON.stringify(dados, null, 2), 'utf8')
  } catch (e) {
    console.error(e)
  }
}

function fmtMoeda(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function fmtData(d) {
  if (!d) return 'N/A'
  const p = String(d).split('-')
  if (p.length !== 3) return d
  return p[2] + '/' + p[1] + '/' + p[0]
}

function dataHoje() {
  return new Date().toISOString().split('T')[0]
}

function jaPassou(data, hora) {
  return new Date(data + 'T' + (hora || '23:59') + ':00') < new Date()
}

function aviso(tipo, msg, idOk, idErro) {
  const ok = document.getElementById(idOk || 'avisoOk')
  const err = document.getElementById(idErro || 'avisoErro')

  if (tipo === 'ok') {
    if (err) err.style.display = 'none'
    if (ok) {
      ok.textContent = msg
      ok.style.display = 'block'
      setTimeout(() => {
        ok.style.display = 'none'
      }, 3200)
    }
  } else {
    if (ok) ok.style.display = 'none'
    if (err) {
      err.textContent = msg
      err.style.display = 'block'
      setTimeout(() => {
        err.style.display = 'none'
      }, 4000)
    }
  }
}

function aplicarTemaAtual() {
  const tema = localStorage.getItem('@PETFLOW:tema') || 'dark'
  document.documentElement.setAttribute('data-tema', tema)
}

function confirmarAcao(mensagem, titulo) {
  return new Promise((resolve) => {
    try {
      const antigo = document.getElementById('pfConfirmOverlay')
      if (antigo) antigo.remove()

      const overlay = document.createElement('div')
      overlay.id = 'pfConfirmOverlay'
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'background:rgba(5,10,20,.55)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'z-index:99999',
        'backdrop-filter: blur(2px)'
      ].join(';')

      const box = document.createElement('div')
      box.style.cssText = [
        'width:min(92vw, 440px)',
        'background:#161f35',
        'color:#e8eefc',
        'border:1px solid rgba(99,134,231,.35)',
        'border-radius:12px',
        'padding:16px',
        'box-shadow:0 14px 35px rgba(0,0,0,.45)'
      ].join(';')

      const t = document.createElement('div')
      t.textContent = titulo || 'Confirmar ação'
      t.style.cssText = 'font-weight:800;font-size:16px;margin-bottom:10px;'

      const m = document.createElement('div')
      m.textContent = mensagem || 'Deseja continuar?'
      m.style.cssText = 'font-size:14px;line-height:1.45;color:#c7d4ef;margin-bottom:14px;'

      const acts = document.createElement('div')
      acts.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;'

      const btnNo = document.createElement('button')
      btnNo.type = 'button'
      btnNo.textContent = 'Cancelar'
      btnNo.style.cssText = [
        'padding:8px 12px',
        'border-radius:8px',
        'border:1px solid rgba(128,153,204,.5)',
        'background:#121a2c',
        'color:#d5def3',
        'cursor:pointer'
      ].join(';')

      const btnYes = document.createElement('button')
      btnYes.type = 'button'
      btnYes.textContent = 'Confirmar'
      btnYes.style.cssText = [
        'padding:8px 12px',
        'border-radius:8px',
        'border:none',
        'background:#e23b4a',
        'color:white',
        'font-weight:700',
        'cursor:pointer'
      ].join(';')

      const previous = document.activeElement

      const cleanup = (val) => {
        try {
          document.removeEventListener('keydown', onKey)
          if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay)
          if (previous && typeof previous.focus === 'function') {
            setTimeout(() => {
              try { previous.focus() } catch (e) {}
            }, 10)
          }
        } catch (e) {}
        resolve(Boolean(val))
      }

      const onKey = (ev) => {
        if (ev.key === 'Escape') {
          ev.preventDefault()
          cleanup(false)
        } else if (ev.key === 'Enter') {
          ev.preventDefault()
          cleanup(true)
        }
      }

      btnNo.onclick = () => cleanup(false)
      btnYes.onclick = () => cleanup(true)
      overlay.onclick = (ev) => {
        if (ev.target === overlay) cleanup(false)
      }

      acts.appendChild(btnNo)
      acts.appendChild(btnYes)
      box.appendChild(t)
      box.appendChild(m)
      box.appendChild(acts)
      overlay.appendChild(box)
      document.body.appendChild(overlay)
      document.addEventListener('keydown', onKey)

      setTimeout(() => {
        try { btnYes.focus() } catch (e) {}
      }, 20)
    } catch (err) {
      const ok = confirm(mensagem || 'Deseja continuar?')
      resolve(Boolean(ok))
    }
  })
}

