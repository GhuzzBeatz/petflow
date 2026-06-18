if (typeof aplicarTemaAtual === 'function') {
  aplicarTemaAtual()
}

const __reqAnimais = (() => {
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

const fsAnimais = __reqAnimais ? __reqAnimais('fs') : null
const pathAnimais = __reqAnimais ? __reqAnimais('path') : null
let shell = null
try {
  shell = __reqAnimais ? __reqAnimais('electron').shell : null
} catch (err) {
  console.warn('[Animais] electron.shell indisponivel nesta tela:', err && err.message ? err.message : err)
}

let editandoId = null
let modalAnimalId = null
let prontuarioAnimalId = null

function normalizarBusca(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function apenasDigitos(texto) {
  return String(texto || '').replace(/\D/g, '')
}

function localizarClientePorBusca(clientes, termoBruto) {
  let termo = String(termoBruto || '').trim()
  if (!termo) return null

  if (termo.includes(' - ')) {
    termo = termo.split(' - ')[0].trim()
  }

  const termoNorm = normalizarBusca(termo)
  const termoDigitos = apenasDigitos(termo)

  const exatos = clientes.filter((c) => {
    const nome = normalizarBusca(c.nome || '')
    const tel = apenasDigitos(c.telefone || '')
    return nome === termoNorm || (termoDigitos && tel === termoDigitos)
  })
  if (exatos.length === 1) return exatos[0]

  const parciais = clientes.filter((c) => {
    const nome = normalizarBusca(c.nome || '')
    const tel = apenasDigitos(c.telefone || '')
    return nome.includes(termoNorm) || (termoDigitos && tel.includes(termoDigitos))
  })
  if (parciais.length === 1) return parciais[0]

  return null
}

function getAnimais() {
  const lista = lerArq('animais.json')
  try {
    if (Array.isArray(lista)) {
      localStorage.setItem('@PETFLOW:animais-cache', JSON.stringify(lista))
    }
  } catch (e) {}
  return lista
}

function salvarAnimais(lista) {
  salvarArq('animais.json', lista)
  try {
    localStorage.setItem('@PETFLOW:animais-cache', JSON.stringify(lista || []))
  } catch (e) {}
}

function getClientesDisponiveis() {
  const arquivo = typeof lerArq === 'function' ? lerArq('clientes.json') : []
  if (Array.isArray(arquivo) && arquivo.length) {
    try {
      localStorage.setItem('@PETFLOW:clientes-cache', JSON.stringify(arquivo))
    } catch (e) {}
    return arquivo
  }

  // fallback para ler clientes de caminhos comuns do instalador
  const extras = []
  const fontes = []
  try {
    if (pathAnimais && typeof getDataDir === 'function') fontes.push(pathAnimais.join(getDataDir(), 'clientes.json'))
  } catch (e) {}
  try {
    if (pathAnimais && typeof process !== 'undefined' && process.env && process.env.APPDATA) {
      fontes.push(pathAnimais.join(process.env.APPDATA, 'petflow', 'data', 'clientes.json'))
      fontes.push(pathAnimais.join(process.env.APPDATA, 'PetFlow', 'data', 'clientes.json'))
    }
  } catch (e) {}
  try {
    if (pathAnimais && typeof __dirname !== 'undefined') fontes.push(pathAnimais.join(__dirname, '..', 'data', 'clientes.json'))
  } catch (e) {}

  if (fsAnimais && pathAnimais) {
    for (const f of fontes) {
      try {
        if (!f || !fsAnimais.existsSync(f)) continue
        const raw = fsAnimais.readFileSync(f, 'utf8').trim() || '[]'
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) extras.push(...arr)
      } catch (e) {}
    }
  }

  if (extras.length) {
    const dedup = []
    const seen = new Set()
    for (const c of extras) {
      const key = c && c.id ? `id:${c.id}` : `${normalizarBusca(c?.nome || '')}|${apenasDigitos(c?.telefone || '')}`
      if (seen.has(key)) continue
      seen.add(key)
      dedup.push(c)
    }
    try {
      localStorage.setItem('@PETFLOW:clientes-cache', JSON.stringify(dedup))
    } catch (e) {}
    return dedup
  }

  try {
    const cache = JSON.parse(localStorage.getItem('@PETFLOW:clientes-cache') || '[]')
    if (Array.isArray(cache)) return cache
  } catch (e) {}

  return []
}

function garantirEstruturaAnimal(animal) {
  return {
    ...animal,
    vacinas: Array.isArray(animal.vacinas) ? animal.vacinas : [],
    fichaClinica: typeof animal.fichaClinica === 'string' ? animal.fichaClinica : '',
    receitaDigital: typeof animal.receitaDigital === 'string' ? animal.receitaDigital : '',
    anexosExames: Array.isArray(animal.anexosExames) ? animal.anexosExames : []
  }
}

function normalizarBaseAnimais() {
  const lista = getAnimais().map(garantirEstruturaAnimal)
  salvarAnimais(lista)
}

// ===== AUTOCOMPLETE DONO =====
function filtrarDono() {
  const buscaBruta = document.getElementById('donoBusca').value
  const busca = normalizarBusca(buscaBruta)
  const buscaDigitos = apenasDigitos(buscaBruta)
  const donoIdInput = document.getElementById('donoId')
  if (donoIdInput) donoIdInput.value = ''

  const datalist = document.getElementById('donoSugestoes')
  const list = document.getElementById('acList')
  const clientes = getClientesDisponiveis()
  if (!datalist) return

  let matches = []
  if (!busca) {
    matches = clientes
  } else {
    matches = clientes.filter((c) => {
      const nome = normalizarBusca(c.nome || '')
      const tel = apenasDigitos(c.telefone || '')
      return nome.includes(busca) || (buscaDigitos && tel.includes(buscaDigitos))
    })
  }

  matches = matches.slice(0, 30)

  datalist.innerHTML = matches
    .map((c) => {
      const nome = String(c.nome || '').trim()
      const tel = String(c.telefone || '').trim()
      const label = tel ? `${nome} - ${tel}` : nome
      return `<option value="${label}"></option>`
    })
    .join('')

  if (list) {
    if (!clientes.length) {
      list.innerHTML = '<div class="ac-item"><small>Nenhum cliente cadastrado.</small></div>'
      list.style.display = 'block'
    } else if (!matches.length) {
      list.innerHTML = '<div class="ac-item"><small>Nenhum cliente encontrado para esta busca.</small></div>'
      list.style.display = 'block'
    } else {
      list.innerHTML = matches
        .map((c) => {
          const nome = String(c.nome || '').trim()
          const tel = String(c.telefone || '').trim()
          const label = tel ? `${nome} - ${tel}` : nome
          const nomeEsc = nome.replace(/'/g, '&#39;')
          const labelEsc = label.replace(/'/g, '&#39;')
          return `<div class="ac-item" onmousedown="selecionarDono(${Number(c.id) || 0}, '${nomeEsc}', '${labelEsc}')">${nome}<small>${tel || 'sem telefone'}</small></div>`
        })
        .join('')
      list.style.display = 'block'
    }
  }

  if (busca) {
    const dono = localizarClientePorBusca(clientes, buscaBruta)
    if (dono && donoIdInput) donoIdInput.value = String(dono.id)
  }
}

function mostrarSugestoesDono() {
  const clientes = getClientesDisponiveis()
  if (!clientes.length) {
    aviso('erro', 'Nenhum cliente encontrado para vincular dono. Cadastre em Clientes ou digite o nome aqui para criar automaticamente.')
  }
  filtrarDono()
}

function tentarSelecionarDonoPeloTexto() {
  const valor = document.getElementById('donoBusca').value.trim()
  if (!valor || document.getElementById('donoId').value) return

  const busca = normalizarBusca(valor)
  const buscaDigitos = apenasDigitos(valor)

  const clientes = getClientesDisponiveis()
  const encontrados = clientes.filter((c) => {
    const nome = normalizarBusca(c.nome || '')
    const tel = apenasDigitos(c.telefone || '')
    return nome === busca || nome.includes(busca) || (buscaDigitos && tel.includes(buscaDigitos))
  })

  if (encontrados.length === 1) {
    selecionarDono(encontrados[0].id, encontrados[0].nome)
  }
}

function selecionarDono(id, nome) {
  const clientes = getClientesDisponiveis()
  let dono = null
  if (id) {
    dono = clientes.find((c) => String(c.id) === String(id))
  }
  if (!dono && nome) {
    dono = localizarClientePorBusca(clientes, nome)
  }

  const donoBusca = document.getElementById('donoBusca')
  const donoId = document.getElementById('donoId')
  if (donoBusca) donoBusca.value = dono?.nome || nome || ''
  if (donoId) donoId.value = dono ? String(dono.id) : (id ? String(id) : '')

  const list = document.getElementById('acList')
  if (list) list.style.display = 'none'
}

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('acWrap')
  const list = document.getElementById('acList')
  if (!wrap || !list) return
  if (!wrap.contains(e.target)) {
    list.style.display = 'none'
  }
})

const donoBuscaInput = document.getElementById('donoBusca')
if (donoBuscaInput) {
  filtrarDono()
  donoBuscaInput.addEventListener('blur', () => {
    setTimeout(tentarSelecionarDonoPeloTexto, 120)
  })
  donoBuscaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      tentarSelecionarDonoPeloTexto()
    }
  })
}

// ===== CRUD ANIMAIS =====
function salvarAnimal() {
  try {
    const nome = document.getElementById('nomeAnimal').value.trim()
    const especie = document.getElementById('especie').value.trim()
    const raca = document.getElementById('raca').value.trim()
    const nascimento = document.getElementById('nascimento').value
    const peso = document.getElementById('peso').value
    const obs = document.getElementById('obsAnimal').value.trim()
    const donoIdValor = document.getElementById('donoId').value
    const donoBusca = document.getElementById('donoBusca').value.trim()

    if (!nome) {
      aviso('erro', 'Informe o nome do animal.')
      return
    }

    const clientes = getClientesDisponiveis()
    let dono = null

    if (donoIdValor) {
      dono = clientes.find((c) => String(c.id) === String(donoIdValor))
    }

    if (!dono && donoBusca) {
      dono = localizarClientePorBusca(clientes, donoBusca)
      if (dono) {
        document.getElementById('donoId').value = String(dono.id)
        document.getElementById('donoBusca').value = dono.nome || donoBusca
      }
    }

    if (!dono && !donoBusca) {
      aviso('erro', 'Informe o dono do pet (nome ou telefone).')
      return
    }

    const donoNomeFinal = (dono && dono.nome) ? String(dono.nome) : String(donoBusca || '').trim()
    const donoIdFinal = dono && dono.id !== undefined && dono.id !== null ? dono.id : null

    let lista = getAnimais().map(garantirEstruturaAnimal)

    if (editandoId) {
      lista = lista.map((a) => {
        if (a.id !== editandoId) return a
        return {
          ...a,
          nome,
          especie,
          raca,
          nascimento,
          peso,
          obs,
          donoId: donoIdFinal,
          donoNome: donoNomeFinal
        }
      })
      aviso('ok', 'Animal atualizado com sucesso.')
      cancelar()
    } else {
      lista.push(
        garantirEstruturaAnimal({
          id: Date.now(),
          nome,
          especie,
          raca,
          nascimento,
          peso,
          obs,
          donoId: donoIdFinal,
          donoNome: donoNomeFinal
        })
      )
      aviso('ok', `${nome} cadastrado(a).`)
      limpar()
    }

    salvarAnimais(lista)
    renderAnimais()
  } catch (err) {
    console.error('[Animais] Falha no cadastro:', err)
    const msg = err && err.message ? err.message : 'erro desconhecido'
    aviso('erro', `Nao foi possivel cadastrar o pet: ${msg}`)
  }
}


function editar(id) {
  const a = getAnimais().map(garantirEstruturaAnimal).find((x) => x.id === id)
  if (!a) return

  document.getElementById('nomeAnimal').value = a.nome || ''
  document.getElementById('especie').value = a.especie || ''
  document.getElementById('raca').value = a.raca || ''
  document.getElementById('nascimento').value = a.nascimento || ''
  document.getElementById('peso').value = a.peso || ''
  document.getElementById('obsAnimal').value = a.obs || ''
  document.getElementById('donoBusca').value = a.donoNome || ''
  document.getElementById('donoId').value = a.donoId || ''

  document.getElementById('formTitulo').textContent = 'Editar Animal'
  document.getElementById('btnSalvar').textContent = 'Salvar alteracoes'
  document.getElementById('btnCancelar').style.display = 'inline-flex'

  editandoId = id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function limpar() {
  ;['nomeAnimal', 'especie', 'raca', 'nascimento', 'peso', 'obsAnimal', 'donoBusca', 'donoId'].forEach((id) => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
}

function cancelar() {
  editandoId = null
  limpar()
  document.getElementById('formTitulo').textContent = 'Novo Animal'
  document.getElementById('btnSalvar').textContent = '+ Cadastrar Animal'
  document.getElementById('btnCancelar').style.display = 'none'
}

async function excluir(id) {
  const atual = getAnimais()
  const animal = atual.find((a) => String(a.id) === String(id))
  if (!animal) return

  const ok = await confirmarAcao(`Excluir o animal "${animal.nome}"?`, 'Excluir animal')
  if (!ok) return

  const lista = atual.filter((a) => String(a.id) !== String(id))
  salvarAnimais(lista)
  renderAnimais()
}

// ===== VACINAS =====
function abrirVacinas(id) {
  modalAnimalId = id
  const animal = getAnimais().map(garantirEstruturaAnimal).find((x) => x.id === id)
  if (!animal) return

  document.getElementById('modalNomeAnimal').textContent = `${animal.nome} - Carteira de vacinacao`
  document.getElementById('modalVacinas').style.display = 'flex'
  renderVacinas(animal)
}

function fecharVacinas() {
  document.getElementById('modalVacinas').style.display = 'none'
  modalAnimalId = null
}

function renderVacinas(animal) {
  const vacinas = animal.vacinas || []
  const box = document.getElementById('listaVacinas')

  if (!vacinas.length) {
    box.innerHTML = '<div class="empty" style="padding:20px">Nenhuma vacina registrada.</div>'
    return
  }

  const hoje = new Date()
  box.innerHTML = vacinas
    .map((v, i) => {
      let statusClass = 'vac-ok'
      let statusTxt = 'Em dia'

      if (v.proxima) {
        const prox = new Date(v.proxima)
        const diff = Math.ceil((prox - hoje) / (1000 * 60 * 60 * 24))

        if (diff < 0) {
          statusClass = 'vac-venc'
          statusTxt = 'Vencida'
        } else if (diff <= 30) {
          statusClass = 'vac-alert'
          statusTxt = `Vence em ${diff} dia(s)`
        }
      }

      return `
        <div class="vac-row">
          <div>
            <div class="vac-nome">${v.nome}</div>
            <div class="vac-data">Aplicada: ${fmtData(v.data)} ${v.proxima ? ' | Proxima: ' + fmtData(v.proxima) : ''}</div>
            ${v.obs ? `<div class="vac-data">${v.obs}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="vac-prox ${statusClass}">${statusTxt}</span>
            <button class="btn-danger" onclick="removerVacina(${i})" title="Remover">Remover</button>
          </div>
        </div>`
    })
    .join('')
}

function adicionarVacina() {
  const nome = document.getElementById('vacNome').value.trim()
  const data = document.getElementById('vacData').value
  const proxima = document.getElementById('vacProxima').value
  const obs = document.getElementById('vacObs').value.trim()

  if (!nome || !data) {
    aviso('erro', 'Informe nome da vacina e data de aplicacao.')
    return
  }

  const lista = getAnimais().map(garantirEstruturaAnimal)
  const animal = lista.find((a) => a.id === modalAnimalId)
  if (!animal) return

  animal.vacinas.push({
    nome,
    data,
    proxima,
    obs
  })

  salvarAnimais(lista)

  document.getElementById('vacNome').value = ''
  document.getElementById('vacData').value = ''
  document.getElementById('vacProxima').value = ''
  document.getElementById('vacObs').value = ''

  renderVacinas(animal)
}

function removerVacina(idx) {
  const lista = getAnimais().map(garantirEstruturaAnimal)
  const animal = lista.find((a) => a.id === modalAnimalId)
  if (!animal) return

  animal.vacinas.splice(idx, 1)
  salvarAnimais(lista)
  renderVacinas(animal)
}

// ===== PRONTUARIO / RECEITA / ANEXOS =====
function abrirProntuario(id) {
  prontuarioAnimalId = id

  const lista = getAnimais().map(garantirEstruturaAnimal)
  const animal = lista.find((a) => a.id === id)
  if (!animal) return

  document.getElementById('tituloProntuario').textContent = `${animal.nome} - Ficha clinica e receita`
  document.getElementById('fichaTexto').value = animal.fichaClinica || ''
  document.getElementById('receitaTexto').value = animal.receitaDigital || ''
  document.getElementById('modalProntuario').style.display = 'flex'

  renderAnexosExames(animal)
}

function fecharProntuario() {
  document.getElementById('modalProntuario').style.display = 'none'
  const input = document.getElementById('inputExames')
  if (input) input.value = ''
  prontuarioAnimalId = null
}

function abrirSeletorExames() {
  const input = document.getElementById('inputExames')
  if (input) input.click()
}

function obterPastaAnexosAnimal(animalId) {
  if (!pathAnimais || !fsAnimais) return null
  const base = pathAnimais.join(getDataDir(), 'anexos_exames', String(animalId))
  if (!fsAnimais.existsSync(base)) fsAnimais.mkdirSync(base, { recursive: true })
  return base
}

function tamanhoHumano(bytes) {
  const b = Number(bytes || 0)
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}

function anexarExamesSelecionados() {
  const input = document.getElementById('inputExames')
  const files = Array.from(input.files || [])

  if (!files.length || !prontuarioAnimalId) return

  const lista = getAnimais().map(garantirEstruturaAnimal)
  const animal = lista.find((a) => String(a.id) === String(prontuarioAnimalId))
  if (!animal) return

  const pastaDestino = obterPastaAnexosAnimal(prontuarioAnimalId)
  if (!pastaDestino || !pathAnimais || !fsAnimais) {
    aviso('erro', 'Nao foi possivel anexar neste ambiente.')
    return
  }

  files.forEach((f, i) => {
    try {
      const ext = pathAnimais.extname(f.name || '')
      const nomeBase = String(pathAnimais.basename(f.name || 'arquivo', ext)).replace(/[^a-zA-Z0-9_-]/g, '_')
      const nomeFinal = `${Date.now()}_${i}_${nomeBase}${ext}`
      const destino = pathAnimais.join(pastaDestino, nomeFinal)

      fsAnimais.copyFileSync(f.path, destino)

      const stat = fsAnimais.statSync(destino)
      animal.anexosExames.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        nome: f.name,
        caminho: destino,
        tamanho: stat.size,
        criadoEm: new Date().toISOString()
      })
    } catch (err) {
      console.error('Falha ao anexar arquivo:', err)
    }
  })

  salvarAnimais(lista)
  renderAnexosExames(animal)
  input.value = ''

  aviso('ok', 'Anexo(s) registrado(s) no historico do animal.')
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
            <div class="anexo-meta">${fmtData(String(a.criadoEm || '').slice(0, 10))} | ${tamanhoHumano(a.tamanho)}</div>
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
  const lista = getAnimais().map(garantirEstruturaAnimal)
  const animal = lista.find((a) => String(a.id) === String(prontuarioAnimalId))
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

function removerAnexoExame(anexoId) {
  const lista = getAnimais().map(garantirEstruturaAnimal)
  const animal = lista.find((a) => String(a.id) === String(prontuarioAnimalId))
  if (!animal) return

  const alvo = (animal.anexosExames || []).find((x) => x.id === anexoId)
  animal.anexosExames = (animal.anexosExames || []).filter((x) => x.id !== anexoId)

  if (alvo && alvo.caminho && fsAnimais.existsSync(alvo.caminho)) {
    try {
      fsAnimais.unlinkSync(alvo.caminho)
    } catch (err) {
      console.error('Falha ao remover anexo fisico:', err)
    }
  }

  salvarAnimais(lista)
  renderAnexosExames(animal)
}

function salvarProntuario() {
  const ficha = document.getElementById('fichaTexto').value
  const receita = document.getElementById('receitaTexto').value

  const lista = getAnimais().map(garantirEstruturaAnimal)
  const animal = lista.find((a) => String(a.id) === String(prontuarioAnimalId))
  if (!animal) return

  animal.fichaClinica = ficha
  animal.receitaDigital = receita

  salvarAnimais(lista)
  aviso('ok', 'Prontuario salvo com sucesso.')
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
  const lista = getAnimais().map(garantirEstruturaAnimal)
  const animal = lista.find((a) => String(a.id) === String(prontuarioAnimalId))
  if (!animal) return

  const receita = (document.getElementById('receitaTexto').value || '').trim()
  if (!receita) {
    aviso('erro', 'Escreva a receita digital antes de imprimir.')
    return
  }

  const clientes = lerArq('clientes.json')
  const dono = clientes.find((c) => String(c.id) === String(animal.donoId))

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
        .small { font-size: 12px; color: #444; margin-top: 6px; }
      </style>
    </head>
    <body>
      <h1>Receita Veterinaria</h1>
      <div class="meta"><strong>Paciente:</strong> ${escaparHtml(animal.nome)} | <strong>Dono:</strong> ${escaparHtml((dono && dono.nome) || animal.donoNome || 'N/A')}</div>
      <div class="meta"><strong>Data:</strong> ${fmtData(dataHoje())}</div>
      <div class="box">${escaparHtml(receita)}</div>
      <div class="assinatura">
        <div class="linha"></div>
        <div class="small">Assinatura / Carimbo</div>
      </div>
      <script>
        setTimeout(function(){ window.print(); }, 300);
      </script>
    </body>
    </html>
  `

  const janela = window.open('', '_blank', 'width=900,height=760')
  if (!janela) {
    aviso('erro', 'Nao foi possivel abrir a janela de impressao.')
    return
  }

  janela.document.open()
  janela.document.write(html)
  janela.document.close()
}

// ===== LISTAGEM =====
function renderAnimais() {
  const busca = (document.getElementById('busca')?.value || '').toLowerCase().trim()
  const filtroEspecie = document.getElementById('filtroEspecie')?.value || ''

  let lista = getAnimais().map(garantirEstruturaAnimal)
  const total = lista.length

  if (busca) {
    lista = lista.filter((a) => {
      const nome = String(a.nome || '').toLowerCase()
      const donoNome = String(a.donoNome || '').toLowerCase()
      const raca = String(a.raca || '').toLowerCase()
      const obs = String(a.obs || '').toLowerCase()
      return nome.includes(busca) || donoNome.includes(busca) || raca.includes(busca) || obs.includes(busca)
    })
  }

  if (filtroEspecie) {
    lista = lista.filter((a) => String(a.especie || '').toLowerCase() === filtroEspecie.toLowerCase())
  }

  const ct = document.getElementById('count')
  if (ct) ct.textContent = `${lista.length} de ${total} animal(is)`

  const tb = document.getElementById('tbody')
  if (!tb) return

  if (!lista.length) {
    tb.innerHTML = '<tr><td colspan="7" class="empty">Nenhum animal encontrado.</td></tr>'
    return
  }

  tb.innerHTML = lista
    .map((a) => {
      const vacinasVencidas = (a.vacinas || []).filter((v) => v.proxima && new Date(v.proxima) < new Date()).length
      const alertaVacina = vacinasVencidas > 0 ? `<span style="color:var(--red);font-size:11px;font-weight:800"> (${vacinasVencidas})</span>` : ''

      return `
        <tr>
          <td><b style="color:var(--fg)">${a.nome}</b></td>
          <td><span class="badge b-blue">${a.especie || 'N/A'}</span></td>
          <td style="color:var(--fg2)">${a.raca || 'N/A'}</td>
          <td><b style="color:var(--fg2)">${a.donoNome || 'N/A'}</b></td>
          <td style="color:var(--muted);font-size:12px">${a.nascimento ? fmtData(a.nascimento) : 'N/A'}</td>
          <td style="color:var(--muted);font-size:12px">${a.peso ? `${a.peso} kg` : 'N/A'}</td>
          <td style="text-align:center" class="tbl-actions">
            <button class="btn-edit" onclick="abrirVacinas(${a.id})" title="Vacinas">Vacinas${alertaVacina}</button>
            <button class="btn-edit" onclick="abrirProntuario(${a.id})" title="Ficha clinica e receita">Prontuario</button>
            <button class="btn-edit" onclick="editar(${a.id})" title="Editar">Editar</button>
            <button class="btn-danger" onclick="excluir(${a.id})" title="Excluir">Excluir</button>
          </td>
        </tr>`
    })
    .join('')
}

normalizarBaseAnimais()
renderAnimais()

// fallback de binding para evitar falha de clique em alguns ambientes
try {
  window.salvarAnimal = salvarAnimal
  const btnSalvar = document.getElementById('btnSalvar')
  if (btnSalvar && !btnSalvar.__petflowBound) {
    btnSalvar.addEventListener('click', (ev) => {
      ev.preventDefault()
      salvarAnimal()
    })
    btnSalvar.__petflowBound = true
  }
} catch (e) {}
