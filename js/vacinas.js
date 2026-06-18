aplicarTemaAtual()

function garantirEstruturaAnimal(animal) {
  return {
    ...animal,
    vacinas: Array.isArray(animal.vacinas) ? animal.vacinas : []
  }
}

function getAnimais() {
  return lerArq('animais.json').map(garantirEstruturaAnimal)
}

function salvarAnimais(lista) {
  salvarArq('animais.json', lista)
}

function popularSelectAnimais() {
  const sel = document.getElementById('animalId')
  const animais = getAnimais().sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')))

  sel.innerHTML = animais.length
    ? '<option value="">Selecione...</option>' +
      animais.map((a) => `<option value="${a.id}">${a.nome} - ${a.donoNome || 'Sem dono'}</option>`).join('')
    : '<option value="">Nenhum animal cadastrado</option>'
}

function obterStatusVacina(proxima) {
  if (!proxima) return { classe: 'b-green', texto: 'Em dia', codigo: 'emdia' }

  const hoje = new Date()
  const dt = new Date(proxima)
  const diffDias = Math.ceil((dt - hoje) / (1000 * 60 * 60 * 24))

  if (diffDias < 0) return { classe: 'b-red', texto: 'Vencida', codigo: 'vencida' }
  if (diffDias <= 30) return { classe: 'b-orange', texto: `Vence em ${diffDias} dia(s)`, codigo: 'vencendo' }
  return { classe: 'b-green', texto: 'Em dia', codigo: 'emdia' }
}

function coletarRegistrosVacinas(animais) {
  const out = []
  animais.forEach((animal) => {
    ;(animal.vacinas || []).forEach((v, idx) => {
      const id = v.id || `${animal.id}_${idx}_${v.data || 'semdata'}`
      const status = obterStatusVacina(v.proxima)
      out.push({
        id,
        animalId: animal.id,
        animalNome: animal.nome || 'N/A',
        donoNome: animal.donoNome || 'N/A',
        nome: v.nome || 'Vacina',
        data: v.data || '',
        proxima: v.proxima || '',
        obs: v.obs || '',
        status
      })
    })
  })

  return out.sort((a, b) => {
    const da = a.proxima || a.data || '9999-12-31'
    const db = b.proxima || b.data || '9999-12-31'
    return da.localeCompare(db)
  })
}

function normalizarTexto(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function adicionarVacina() {
  const animalId = Number(document.getElementById('animalId').value)
  const nome = document.getElementById('vacNome').value.trim()
  const data = document.getElementById('vacData').value
  const proxima = document.getElementById('vacProxima').value
  const obs = document.getElementById('vacObs').value.trim()

  if (!animalId) return aviso('erro', 'Selecione o animal.')
  if (!nome || !data) return aviso('erro', 'Informe nome da vacina e data de aplicacao.')

  const animais = getAnimais()
  const animal = animais.find((a) => Number(a.id) === animalId)
  if (!animal) return aviso('erro', 'Animal nao encontrado.')

  animal.vacinas.push({
    id: `vac_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    nome,
    data,
    proxima,
    obs
  })

  salvarAnimais(animais)
  document.getElementById('vacNome').value = ''
  document.getElementById('vacData').value = ''
  document.getElementById('vacProxima').value = ''
  document.getElementById('vacObs').value = ''

  aviso('ok', `Vacina registrada para ${animal.nome}.`)
  renderVacinas()
}

async function removerVacina(animalId, vacinaId) {
  const ok = await confirmarAcao('Remover esta vacina do historico?', 'Excluir vacina')
  if (!ok) return

  const animais = getAnimais()
  const animal = animais.find((a) => Number(a.id) === Number(animalId))
  if (!animal) return

  animal.vacinas = (animal.vacinas || []).filter((v, idx) => {
    const id = v.id || `${animal.id}_${idx}_${v.data || 'semdata'}`
    return id !== vacinaId
  })

  salvarAnimais(animais)
  aviso('ok', 'Vacina removida com sucesso.')
  renderVacinas()
}

function renderVacinas() {
  const animais = getAnimais()
  const todos = coletarRegistrosVacinas(animais)

  const busca = normalizarTexto(document.getElementById('busca').value)
  const filtroMes = document.getElementById('filtroMes').value
  const filtroStatus = document.getElementById('filtroStatus').value

  const filtrados = todos.filter((r) => {
    if (busca) {
      const blob = normalizarTexto(`${r.animalNome} ${r.donoNome} ${r.nome} ${r.obs}`)
      if (!blob.includes(busca)) return false
    }

    if (filtroStatus && r.status.codigo !== filtroStatus) return false

    if (filtroMes) {
      const baseData = r.proxima || r.data
      if (!baseData) return false
      const m = Number(String(baseData).split('-')[1] || 0)
      if (m !== Number(filtroMes)) return false
    }

    return true
  })

  document.getElementById('count').textContent = `${filtrados.length} de ${todos.length} vacina(s)`

  const tb = document.getElementById('tbody')
  if (!filtrados.length) {
    tb.innerHTML = '<tr><td colspan="8" class="empty">Nenhuma vacina encontrada com esse filtro.</td></tr>'
    return
  }

  tb.innerHTML = filtrados
    .map((r) => {
      return `
        <tr>
          <td><b style="color:var(--fg)">${r.animalNome}</b></td>
          <td>${r.donoNome}</td>
          <td>${r.nome}</td>
          <td>${r.data ? fmtData(r.data) : 'N/A'}</td>
          <td>${r.proxima ? fmtData(r.proxima) : 'N/A'}</td>
          <td><span class="badge ${r.status.classe}">${r.status.texto}</span></td>
          <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.obs || 'N/A'}</td>
          <td style="text-align:center">
            <button class="btn-danger" onclick="removerVacina(${r.animalId}, '${r.id}')">Remover</button>
          </td>
        </tr>`
    })
    .join('')
}

popularSelectAnimais()
renderVacinas()
