if (typeof aplicarTemaAtual === 'function') {
  aplicarTemaAtual()
}

const __reqPront = (() => {
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

const fsPront = __reqPront ? __reqPront('fs') : null
const pathPront = __reqPront ? __reqPront('path') : null
let shell = null
try {
  shell = __reqPront ? __reqPront('electron').shell : null
} catch (e) {
  shell = null
}

let animalSelecionadoId = null
let cacheAnimais = []

function idTexto(v) {
  return String(v === undefined || v === null ? '' : v).trim()
}

function mesmoId(a, b) {
  return idTexto(a) !== '' && idTexto(a) === idTexto(b)
}

function garantirEstruturaAnimal(animal) {
  return {
    ...animal,
    vacinas: Array.isArray(animal.vacinas) ? animal.vacinas : [],
    fichaClinica: typeof animal.fichaClinica === 'string' ? animal.fichaClinica : '',
    receitaDigital: typeof animal.receitaDigital === 'string' ? animal.receitaDigital : '',
    prontuarioAtualizadoEm: animal.prontuarioAtualizadoEm || '',
    anexosExames: Array.isArray(animal.anexosExames) ? animal.anexosExames : []
  }
}

function getAnimais() {
  const principais = lerArq('animais.json')
  if (Array.isArray(principais) && principais.length) {
    try {
      localStorage.setItem('@PETFLOW:animais-cache', JSON.stringify(principais))
    } catch (e) {}
    return principais.map(garantirEstruturaAnimal)
  }

  // Fallback para builds onde a pagina pode apontar para pasta diferente.
  const fontes = []
  try {
    if (pathPront) fontes.push(pathPront.join(getDataDir(), 'animais.json'))
  } catch (e) {}
  try {
    if (process && process.env && process.env.APPDATA) {
      if (pathPront) {
        fontes.push(pathPront.join(process.env.APPDATA, 'petflow', 'data', 'animais.json'))
        fontes.push(pathPront.join(process.env.APPDATA, 'PetFlow', 'data', 'animais.json'))
      }
    }
  } catch (e) {}
  try {
    if (pathPront && typeof __dirname !== 'undefined') fontes.push(pathPront.join(__dirname, '..', 'data', 'animais.json'))
  } catch (e) {}

  if (fsPront && pathPront) for (const arquivo of fontes) {
    try {
      if (!arquivo || !fsPront.existsSync(arquivo)) continue
      const raw = fsPront.readFileSync(arquivo, 'utf8').trim() || '[]'
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) {
        try {
          localStorage.setItem('@PETFLOW:animais-cache', JSON.stringify(parsed))
        } catch (e) {}
        return parsed.map(garantirEstruturaAnimal)
      }
    } catch (e) {}
  }

  try {
    const cache = JSON.parse(localStorage.getItem('@PETFLOW:animais-cache') || '[]')
    if (Array.isArray(cache) && cache.length) return cache.map(garantirEstruturaAnimal)
  } catch (e) {}

  return []
}

function salvarAnimais(lista) {
  salvarArq('animais.json', lista)
  try {
    localStorage.setItem('@PETFLOW:animais-cache', JSON.stringify(lista || []))
  } catch (e) {}
}

function normalizarTexto(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function carregarCacheAnimais() {
  cacheAnimais = getAnimais().sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')))
}

function filtrarSelectAnimais() {
  carregarCacheAnimais()
  const termo = normalizarTexto(document.getElementById('buscaAnimal').value)

  const lista = termo
    ? cacheAnimais.filter((a) => {
        const blob = normalizarTexto(`${a.nome} ${a.donoNome || ''}`)
        return blob.includes(termo)
      })
    : cacheAnimais

  const sel = document.getElementById('animalId')
  const atual = animalSelecionadoId

  sel.innerHTML = lista.length
    ? '<option value="">Selecione...</option>' +
      lista.map((a) => `<option value="${a.id}">${a.nome} - ${a.donoNome || 'Sem dono'}</option>`).join('')
    : '<option value="">Nenhum animal encontrado</option>'

  if (lista.length) {
    const candidato = atual && lista.some((a) => mesmoId(a.id, atual)) ? atual : lista[0].id
    sel.value = idTexto(candidato)
    if (!mesmoId(animalSelecionadoId, candidato)) {
      animalSelecionadoId = idTexto(candidato)
      carregarProntuarioAnimal()
    }
  } else {
    animalSelecionadoId = null
  }
}

function carregarProntuarioAnimal() {
  const id = idTexto(document.getElementById('animalId').value)
  if (!id) {
    animalSelecionadoId = null
    document.getElementById('fichaTexto').value = ''
    document.getElementById('receitaTexto').value = ''
    document.getElementById('listaAnexos').innerHTML = '<div class="empty">Nenhum anexo registrado.</div>'
    document.getElementById('resumoPaciente').textContent = 'Selecione um animal para visualizar os dados.'
    return
  }

  carregarCacheAnimais()
  const animal = cacheAnimais.find((a) => mesmoId(a.id, id))
  if (!animal) {
    aviso('erro', 'Animal nao encontrado.')
    return
  }

  animalSelecionadoId = id
  document.getElementById('fichaTexto').value = animal.fichaClinica || ''
  document.getElementById('receitaTexto').value = animal.receitaDigital || ''

  document.getElementById('resumoPaciente').innerHTML = `
    <div><b>Animal:</b> ${animal.nome || 'N/A'}</div>
    <div><b>Dono:</b> ${animal.donoNome || 'N/A'}</div>
    <div><b>Especie:</b> ${animal.especie || 'N/A'} | <b>Raca:</b> ${animal.raca || 'N/A'}</div>
    <div><b>Nascimento:</b> ${animal.nascimento ? fmtData(animal.nascimento) : 'N/A'} | <b>Peso:</b> ${animal.peso ? `${animal.peso} kg` : 'N/A'}</div>
    <div><b>Ultima atualizacao do prontuario:</b> ${animal.prontuarioAtualizadoEm ? fmtData(animal.prontuarioAtualizadoEm.slice(0, 10)) : 'N/A'}</div>
  `

  renderAnexosExames(animal)
}

function obterPastaAnexosAnimal(animalId) {
  if (!fsPront || !pathPront) return null
  const base = pathPront.join(getDataDir(), 'anexos_exames', String(animalId))
  if (!fsPront.existsSync(base)) fsPront.mkdirSync(base, { recursive: true })
  return base
}

function tamanhoHumano(bytes) {
  const b = Number(bytes || 0)
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}

function abrirSeletorExames() {
  if (!animalSelecionadoId) return aviso('erro', 'Selecione um animal antes de anexar exames.')
  document.getElementById('inputExames').click()
}

function anexarExamesSelecionados() {
  const input = document.getElementById('inputExames')
  const files = Array.from(input.files || [])

  if (!animalSelecionadoId || !files.length) return

  const lista = getAnimais()
  const animal = lista.find((a) => mesmoId(a.id, animalSelecionadoId))
  if (!animal) return

  const pastaDestino = obterPastaAnexosAnimal(animalSelecionadoId)
  if (!pastaDestino || !fsPront || !pathPront) {
    aviso('erro', 'Nao foi possivel anexar arquivos neste ambiente.')
    return
  }

  files.forEach((f, i) => {
    try {
      const ext = pathPront.extname(f.name || '')
      const nomeBase = String(pathPront.basename(f.name || 'arquivo', ext)).replace(/[^a-zA-Z0-9_-]/g, '_')
      const nomeFinal = `${Date.now()}_${i}_${nomeBase}${ext}`
      const destino = pathPront.join(pastaDestino, nomeFinal)

      fsPront.copyFileSync(f.path, destino)
      const stat = fsPront.statSync(destino)

      animal.anexosExames.push({
        id: `anx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        nome: f.name,
        caminho: destino,
        tamanho: stat.size,
        criadoEm: new Date().toISOString()
      })
    } catch (err) {
      console.error('Falha ao anexar arquivo:', err)
    }
  })

  animal.prontuarioAtualizadoEm = new Date().toISOString()
  salvarAnimais(lista)
  input.value = ''

  aviso('ok', 'Anexo(s) salvo(s) no historico do animal.')
  carregarProntuarioAnimal()
  renderTabelaHistorico()
}

function renderAnexosExames(animal) {
  const lista = Array.isArray(animal.anexosExames) ? animal.anexosExames : []
  const box = document.getElementById('listaAnexos')

  if (!lista.length) {
    box.innerHTML = '<div class="empty">Nenhum anexo registrado.</div>'
    return
  }

  box.innerHTML = lista
    .map((a) => {
      return `
        <div class="anexo-row">
          <div>
            <div><strong>${a.nome || 'Arquivo'}</strong></div>
            <div class="anexo-meta">${a.criadoEm ? fmtData(String(a.criadoEm).slice(0, 10)) : 'N/A'} | ${tamanhoHumano(a.tamanho)}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-ghost btn-mini" onclick="abrirAnexoExame('${a.id}')">Abrir</button>
            <button class="btn btn-ghost btn-mini" onclick="removerAnexoExame('${a.id}')">Remover</button>
          </div>
        </div>`
    })
    .join('')
}

function abrirAnexoExame(anexoId) {
  if (!animalSelecionadoId) return
  const lista = getAnimais()
  const animal = lista.find((a) => mesmoId(a.id, animalSelecionadoId))
  if (!animal) return

  const anexo = (animal.anexosExames || []).find((x) => x.id === anexoId)
  if (!anexo) return
  if (shell && typeof shell.openPath === 'function') {
    shell.openPath(anexo.caminho)
    return
  }
  const fileUrl = 'file:///' + String(anexo.caminho || '').replace(/\\/g, '/')
  window.open(fileUrl, '_blank')
}

async function removerAnexoExame(anexoId) {
  if (!animalSelecionadoId) return

  const ok = await confirmarAcao('Remover este anexo de exame?', 'Excluir anexo')
  if (!ok) return

  const lista = getAnimais()
  const animal = lista.find((a) => mesmoId(a.id, animalSelecionadoId))
  if (!animal) return

  const alvo = (animal.anexosExames || []).find((x) => x.id === anexoId)
  animal.anexosExames = (animal.anexosExames || []).filter((x) => x.id !== anexoId)

  if (alvo && alvo.caminho && fsPront.existsSync(alvo.caminho)) {
    try {
      fsPront.unlinkSync(alvo.caminho)
    } catch (err) {
      console.error('Falha ao remover anexo:', err)
    }
  }

  animal.prontuarioAtualizadoEm = new Date().toISOString()
  salvarAnimais(lista)
  aviso('ok', 'Anexo removido.')
  carregarProntuarioAnimal()
  renderTabelaHistorico()
}

function salvarProntuario() {
  if (!animalSelecionadoId) return aviso('erro', 'Selecione um animal.')

  const ficha = document.getElementById('fichaTexto').value
  const receita = document.getElementById('receitaTexto').value

  const lista = getAnimais()
  const animal = lista.find((a) => mesmoId(a.id, animalSelecionadoId))
  if (!animal) return

  animal.fichaClinica = ficha
  animal.receitaDigital = receita
  animal.prontuarioAtualizadoEm = new Date().toISOString()

  salvarAnimais(lista)
  aviso('ok', 'Prontuario salvo com sucesso.')
  renderTabelaHistorico()
  carregarProntuarioAnimal()
}

function escaparHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function imprimirReceita() {
  if (!animalSelecionadoId) return aviso('erro', 'Selecione um animal.')

  const lista = getAnimais()
  const animal = lista.find((a) => mesmoId(a.id, animalSelecionadoId))
  if (!animal) return

  const receita = (document.getElementById('receitaTexto').value || '').trim()
  if (!receita) return aviso('erro', 'Escreva a receita antes de imprimir.')

  const html = `
    <!doctype html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Receita - ${escaparHtml(animal.nome)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #111; }
        h1 { margin: 0 0 8px 0; font-size: 24px; }
        .meta { font-size: 14px; margin-bottom: 18px; }
        .box { border: 1px solid #ddd; border-radius: 8px; padding: 14px; min-height: 220px; white-space: pre-wrap; line-height: 1.5; }
        .assinatura { margin-top: 36px; }
        .linha { margin-top: 50px; border-top: 1px solid #333; width: 320px; }
      </style>
    </head>
    <body>
      <h1>Receita Veterinaria</h1>
      <div class="meta"><strong>Paciente:</strong> ${escaparHtml(animal.nome)} | <strong>Dono:</strong> ${escaparHtml(animal.donoNome || 'N/A')}</div>
      <div class="meta"><strong>Data:</strong> ${fmtData(dataHoje())}</div>
      <div class="box">${escaparHtml(receita)}</div>
      <div class="assinatura">
        <div class="linha"></div>
        <div>Assinatura / Carimbo</div>
      </div>
      <script>setTimeout(function(){ window.print(); }, 300);</script>
    </body>
    </html>
  `

  const janela = window.open('', '_blank', 'width=900,height=760')
  if (!janela) return aviso('erro', 'Nao foi possivel abrir janela de impressao.')
  janela.document.open()
  janela.document.write(html)
  janela.document.close()
}

function resumoCurto(texto) {
  const t = String(texto || '').trim()
  if (!t) return 'Sem anotacoes'
  return t.length > 90 ? `${t.slice(0, 90)}...` : t
}

function renderTabelaHistorico() {
  carregarCacheAnimais()
  const lista = cacheAnimais

  document.getElementById('count').textContent = `${lista.length} prontuario(s)`

  const tb = document.getElementById('tbody')
  if (!lista.length) {
    tb.innerHTML = '<tr><td colspan="6" class="empty">Nenhum animal cadastrado.</td></tr>'
    return
  }

  tb.innerHTML = lista
    .map((a) => {
      const idBtn = String(a.id || '').replace(/"/g, '&quot;')
      return `
        <tr>
          <td><b style="color:var(--fg)">${a.nome || 'N/A'}</b></td>
          <td>${a.donoNome || 'N/A'}</td>
          <td style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${resumoCurto(a.fichaClinica)}</td>
          <td>${(a.anexosExames || []).length}</td>
          <td>${a.prontuarioAtualizadoEm ? fmtData(String(a.prontuarioAtualizadoEm).slice(0, 10)) : 'N/A'}</td>
          <td style="text-align:center">
            <button class="btn-edit" onclick="abrirProntuarioPorId('${idBtn}')">Abrir</button>
          </td>
        </tr>`
    })
    .join('')
}

function abrirProntuarioPorId(id) {
  document.getElementById('animalId').value = String(id)
  carregarProntuarioAnimal()
}

function inicializarProntuarios() {
  try {
    filtrarSelectAnimais()
    carregarProntuarioAnimal()
    renderTabelaHistorico()
  } catch (err) {
    console.error('[Prontuarios] Falha na inicializacao:', err)
    const tb = document.getElementById('tbody')
    if (tb) {
      tb.innerHTML = '<tr><td colspan="6" class="empty">Erro ao carregar prontuarios. Feche e abra o app.</td></tr>'
    }
  }
}

inicializarProntuarios()

window.addEventListener('focus', () => {
  try {
    filtrarSelectAnimais()
    renderTabelaHistorico()
  } catch (err) {
    console.error('[Prontuarios] Falha no evento focus:', err)
  }
})

window.addEventListener('storage', (ev) => {
  if (!ev || !ev.key || ev.key.includes('@PETFLOW:FILE:animais.json')) {
    try {
      filtrarSelectAnimais()
      renderTabelaHistorico()
    } catch (err) {
      console.error('[Prontuarios] Falha no evento storage:', err)
    }
  }
})
