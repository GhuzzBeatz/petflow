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

function getProcessTop() {
  try {
    if (typeof window !== 'undefined' && window.top && window.top.process) return window.top.process
  } catch (e) {}
  return null
}

function argDataDir(procRef) {
  try {
    if (!procRef || !Array.isArray(procRef.argv)) return ''
    const arg = procRef.argv.find((a) => String(a || '').startsWith('--data-dir='))
    return arg ? String(arg).replace('--data-dir=', '') : ''
  } catch (e) {
    return ''
  }
}

function coletarCandidatosDataDir() {
  const candidatos = []
  const procAtual = __proc
  const procTop = getProcessTop()
  let procPai = null
  try {
    if (typeof window !== 'undefined' && window.parent && window.parent.process) {
      procPai = window.parent.process
    }
  } catch (e) {}

  const argAtual = argDataDir(procAtual)
  const argPai = argDataDir(procPai)
  const argTop = argDataDir(procTop)
  try {
    if (typeof window !== 'undefined' && window.top && window.top.__PETFLOW_DATA_DIR) {
      candidatos.push(String(window.top.__PETFLOW_DATA_DIR))
    }
  } catch (e) {}
  if (argAtual) candidatos.push(argAtual)
  if (argPai) candidatos.push(argPai)
  if (argTop) candidatos.push(argTop)

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
  try {
    if (procTop && procTop.env && procTop.env.PETFLOW_DATA_DIR) {
      candidatos.push(procTop.env.PETFLOW_DATA_DIR)
    }
  } catch (e) {}

  const appData = (() => {
    try {
      if (procAtual && procAtual.env && procAtual.env.APPDATA) return procAtual.env.APPDATA
    } catch (e) {}
    try {
      if (procTop && procTop.env && procTop.env.APPDATA) return procTop.env.APPDATA
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

  return Array.from(
    new Set(
      candidatos
        .map((d) => String(d || '').trim())
        .filter((d) => d && d !== '__LOCALSTORAGE__')
    )
  )
}

function getDataDir() {
  if (!fs || !path) return '__LOCALSTORAGE__'

  // Se alguma aba ja definiu o caminho, reutiliza para manter todas
  // as paginas lendo/escrevendo exatamente o mesmo diretorio.
  try {
    if (typeof window !== 'undefined' && window.top && window.top.__PETFLOW_DATA_DIR) {
      const travado = String(window.top.__PETFLOW_DATA_DIR || '').trim()
      if (travado && travado !== '__LOCALSTORAGE__') {
        fs.mkdirSync(travado, { recursive: true })
        return travado
      }
    }
  } catch (e) {}

  const candidatos = coletarCandidatosDataDir()

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
try {
  if (typeof window !== 'undefined' && window.parent) {
    window.parent.__PETFLOW_DATA_DIR = DATA_DIR
  }
} catch (e) {}
try {
  if (typeof window !== 'undefined' && window.top) {
    window.top.__PETFLOW_DATA_DIR = DATA_DIR
  }
} catch (e) {}

function lsKey(nome) {
  return `@PETFLOW:FILE:${nome}`
}

function caminhosArquivo(nome) {
  if (!fs || !path || DATA_DIR === '__LOCALSTORAGE__') return []

  const dirs = coletarCandidatosDataDir()
  if (!dirs.includes(DATA_DIR)) dirs.unshift(DATA_DIR)

  const unicos = Array.from(new Set(dirs))
  return unicos.map((d) => path.join(d, nome))
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

  try {
    const arquivos = caminhosArquivo(nome)
    let escolhido = null
    let escolhidoMtime = 0
    let fallback = null
    const fontesValidas = []

    for (const p of arquivos) {
      try {
        const dir = path.dirname(p)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        if (!fs.existsSync(p)) continue
        const raw = fs.readFileSync(p, 'utf8').trim() || '[]'
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) continue

        const mtime = Number(fs.statSync(p).mtimeMs || 0)
        if (!fallback) fallback = parsed
        fontesValidas.push({ lista: parsed, mtime })
        if (parsed.length && (escolhido === null || mtime >= escolhidoMtime)) {
          escolhido = parsed
          escolhidoMtime = mtime
        }
      } catch (e) {}
    }

    let parsed = escolhido || fallback || []

    // Quando existem listas em mais de um diretorio (ex.: PetFlow/petflow),
    // une os registros para evitar "sumico" entre telas.
    if (fontesValidas.length > 1 && Array.isArray(parsed)) {
      const porMtime = [...fontesValidas].sort((a, b) => Number(b.mtime || 0) - Number(a.mtime || 0))
      const base = Array.isArray(porMtime[0].lista) ? [...porMtime[0].lista] : [...parsed]
      const vistos = new Set()

      const chaveItem = (item) => {
        if (item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'id')) {
          return `id:${String(item.id)}`
        }
        return `raw:${JSON.stringify(item)}`
      }

      base.forEach((it) => vistos.add(chaveItem(it)))

      for (let i = 1; i < porMtime.length; i++) {
        const atual = Array.isArray(porMtime[i].lista) ? porMtime[i].lista : []
        atual.forEach((it) => {
          const key = chaveItem(it)
          if (!vistos.has(key)) {
            vistos.add(key)
            base.push(it)
          }
        })
      }

      parsed = base
    }

    // Garante que o principal sempre exista e fique espelhado.
    const principal = path.join(DATA_DIR, nome)
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(principal)) {
      fs.writeFileSync(principal, JSON.stringify(parsed, null, 2), 'utf8')
    }

    try {
      localStorage.setItem(lsKey(nome), JSON.stringify(Array.isArray(parsed) ? parsed : []))
    } catch (e) {}
    return Array.isArray(parsed) ? parsed : []
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

  try {
    const arr = Array.isArray(dados) ? dados : []
    const arquivos = caminhosArquivo(nome)
    if (!arquivos.length) {
      const p = path.join(DATA_DIR, nome)
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
      fs.writeFileSync(p, JSON.stringify(arr, null, 2), 'utf8')
    } else {
      for (const p of arquivos) {
        try {
          const dir = path.dirname(p)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(p, JSON.stringify(arr, null, 2), 'utf8')
        } catch (e) {}
      }
    }
    try {
      localStorage.setItem(lsKey(nome), JSON.stringify(arr))
    } catch (e) {}
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

