aplicarTemaAtual()

function filtrarCliente() {
  const busca = document.getElementById('cliBusca').value.toLowerCase().trim()
  document.getElementById('cliId').value = ''
  document.getElementById('aniSelect').innerHTML = '<option value="">-- selecione o cliente primeiro --</option>'
  const list = document.getElementById('acCli')

  if (!busca) {
    list.style.display = 'none'
    return
  }

  const matches = lerArq('clientes.json')
    .filter((c) =>
      String(c.nome || '').toLowerCase().includes(busca) ||
      String(c.telefone || '').toLowerCase().includes(busca)
    )
    .slice(0, 7)

  if (!matches.length) {
    list.style.display = 'none'
    return
  }

  list.innerHTML = matches
    .map(
      (c) => `
      <div class="ac-item" onmousedown="selecionarCliente(${c.id}, '${String(c.nome || '').replace(/'/g, '&#39;')}')">
        ${c.nome}<small>${c.telefone || 'sem telefone'}</small>
      </div>`
    )
    .join('')

  list.style.display = 'block'
}

function selecionarCliente(id, nome) {
  document.getElementById('cliBusca').value = nome
  document.getElementById('cliId').value = id
  document.getElementById('acCli').style.display = 'none'
  carregarAnimaisDono(id)
}

function carregarAnimaisDono(donoId) {
  const animais = lerArq('animais.json').filter((a) => a.donoId === Number(donoId))
  const sel = document.getElementById('aniSelect')
  sel.innerHTML = '<option value="">Sem animal especifico</option>'
  animais.forEach((a) => {
    sel.innerHTML += `<option value="${a.nome}">${a.nome} (${a.especie || 'N/A'})</option>`
  })
}

document.addEventListener('click', (e) => {
  if (!document.getElementById('acWrapCli')?.contains(e.target)) {
    document.getElementById('acCli').style.display = 'none'
  }
})

function carregarServicos(sel = 'svcSelect') {
  const serv = lerArq('servicos.json')
  const el = document.getElementById(sel)
  el.innerHTML = '<option value="">Selecione o servico...</option>'
  serv.forEach((s) => {
    el.innerHTML += `<option value='${JSON.stringify({ nome: s.nome, valor: s.preco })}'>${s.nome} - ${fmtMoeda(s.preco)}</option>`
  })
}

function salvarAgendamento() {
  const data = document.getElementById('data').value
  const hora = document.getElementById('hora').value
  const cliId = document.getElementById('cliId').value
  const cliBusca = document.getElementById('cliBusca').value.trim()
  const animal = document.getElementById('aniSelect').value
  const svcRaw = document.getElementById('svcSelect').value
  const pagamento = document.getElementById('pagamento').value || 'A definir'
  const obs = document.getElementById('obsAgenda').value.trim()

  if (!data) return aviso('erro', 'Selecione a data.')
  if (!hora) return aviso('erro', 'Informe o horario.')
  if (!cliBusca || !cliId) return aviso('erro', 'Selecione um cliente da lista.')
  if (!svcRaw) return aviso('erro', 'Selecione um servico.')

  const svc = JSON.parse(svcRaw)
  const lista = lerArq('agenda.json')
  lista.push({
    id: Date.now(),
    data,
    hora,
    clienteId: Number(cliId),
    cliente: cliBusca,
    animal,
    servico: svc.nome,
    valor: svc.valor,
    pagamento,
    obs
  })

  salvarArq('agenda.json', lista)
  aviso('ok', 'Agendamento registrado!')

  document.getElementById('hora').value = ''
  document.getElementById('cliBusca').value = ''
  document.getElementById('cliId').value = ''
  document.getElementById('aniSelect').innerHTML = '<option value="">-- selecione o cliente primeiro --</option>'
  document.getElementById('svcSelect').value = ''
  document.getElementById('pagamento').value = 'A definir'
  document.getElementById('obsAgenda').value = ''

  renderAgenda()
}

function abrirEdicao(id) {
  const a = lerArq('agenda.json').find((x) => x.id === id)
  if (!a) return

  document.getElementById('editId').value = id
  document.getElementById('editData').value = a.data
  document.getElementById('editHora').value = a.hora
  document.getElementById('editObs').value = a.obs || ''
  document.getElementById('editPagamento').value = a.pagamento || 'A definir'

  carregarServicos('editSvc')
  const sel = document.getElementById('editSvc')
  for (let i = 0; i < sel.options.length; i++) {
    try {
      if (JSON.parse(sel.options[i].value).nome === a.servico) {
        sel.selectedIndex = i
        break
      }
    } catch (e) {}
  }

  document.getElementById('modalEdit').style.display = 'flex'
}

function fecharModal(e) {
  if (e.target === document.getElementById('modalEdit')) {
    document.getElementById('modalEdit').style.display = 'none'
  }
}

function salvarEdicao() {
  const id = Number(document.getElementById('editId').value)
  const data = document.getElementById('editData').value
  const hora = document.getElementById('editHora').value
  const svcRaw = document.getElementById('editSvc').value
  const pagamento = document.getElementById('editPagamento').value || 'A definir'
  const obs = document.getElementById('editObs').value.trim()

  if (!data || !hora || !svcRaw) return

  const svc = JSON.parse(svcRaw)
  const lista = lerArq('agenda.json').map((a) =>
    a.id === id ? { ...a, data, hora, servico: svc.nome, valor: svc.valor, pagamento, obs } : a
  )

  salvarArq('agenda.json', lista)
  document.getElementById('modalEdit').style.display = 'none'
  renderAgenda()
}

async function excluirAgendamento(id) {
  const ok = await confirmarAcao('Deseja excluir este agendamento? Esta acao nao pode ser desfeita.', 'Excluir agendamento')
  if (!ok) return
  salvarArq('agenda.json', lerArq('agenda.json').filter((a) => a.id !== id))
  renderAgenda()
}

function limparFiltro() {
  document.getElementById('filtroData').value = ''
  document.getElementById('filtroStatus').value = ''
  document.getElementById('filtroPagamento').value = ''
  renderAgenda()
}

function renderAgenda() {
  const filtroData = document.getElementById('filtroData').value
  const filtroStatus = document.getElementById('filtroStatus').value
  const filtroPagamento = document.getElementById('filtroPagamento').value

  let lista = lerArq('agenda.json')

  if (filtroData) lista = lista.filter((a) => a.data === filtroData)
  if (filtroStatus === 'atendido') lista = lista.filter((a) => jaPassou(a.data, a.hora))
  if (filtroStatus === 'pendente') lista = lista.filter((a) => !jaPassou(a.data, a.hora))
  if (filtroPagamento) lista = lista.filter((a) => (a.pagamento || 'A definir') === filtroPagamento)

  lista = [...lista].sort(
    (a, b) => new Date(b.data + 'T' + (b.hora || '00:00')) - new Date(a.data + 'T' + (a.hora || '00:00'))
  )

  const ct = document.getElementById('count')
  if (ct) ct.textContent = `${lista.length} agendamento(s)`

  const tb = document.getElementById('tbody')
  if (!tb) return

  tb.innerHTML = lista.length
    ? lista
        .map((a) => {
          const passou = jaPassou(a.data, a.hora)
          const pagamento = a.pagamento || 'A definir'

          return `
      <tr>
        <td>${fmtData(a.data)}</td>
        <td>${a.hora || 'N/A'}</td>
        <td><b style="color:var(--fg)">${a.cliente}</b></td>
        <td style="color:var(--muted);font-size:12px">${a.animal || 'N/A'}</td>
        <td><span class="badge b-blue">${a.servico}</span></td>
        <td><span class="badge b-purple">${pagamento}</span></td>
        <td><span class="badge ${passou ? 'b-green' : 'b-orange'}">${passou ? 'Atendido' : 'Agendado'}</span></td>
        <td style="text-align:right;color:var(--green);font-weight:700">${fmtMoeda(a.valor)}</td>
        <td style="color:var(--muted);font-size:12px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.obs || ''}</td>
        <td style="text-align:center;white-space:nowrap">
          <button class="btn-edit" onclick="abrirEdicao(${a.id})" title="Editar">Editar</button>
          <button class="btn-danger" onclick="excluirAgendamento(${a.id})" title="Excluir">Excluir</button>
        </td>
      </tr>`
        })
        .join('')
    : '<tr><td colspan="10" class="empty">Nenhum agendamento encontrado.</td></tr>'
}

function parseValor(v) {
  if (typeof v === 'number') return v
  const txt = String(v || '').replace(',', '.').trim()
  const n = Number(txt)
  return Number.isFinite(n) ? n : 0
}

function sinalCaixa(mov) {
  return String(mov.tipo || '').toLowerCase() === 'estorno' ? -1 : 1
}

function salvarCaixa() {
  const data = document.getElementById('cxData').value
  const hora = (document.getElementById('cxHora').value || '').trim()
  const cliente = document.getElementById('cxCliente').value.trim()
  const tipo = document.getElementById('cxTipo').value
  const pagamento = document.getElementById('cxForma').value
  const valor = parseValor(document.getElementById('cxValor').value)
  const obs = document.getElementById('cxObs').value.trim()

  if (!data) return aviso('erro', 'Informe a data do movimento.', 'avisoCaixaOk', 'avisoCaixaErro')
  if (!tipo) return aviso('erro', 'Selecione o tipo do movimento.', 'avisoCaixaOk', 'avisoCaixaErro')
  if (!pagamento) return aviso('erro', 'Selecione a forma de pagamento.', 'avisoCaixaOk', 'avisoCaixaErro')
  if (!Number.isFinite(valor) || valor <= 0) {
    return aviso('erro', 'Informe um valor valido maior que zero.', 'avisoCaixaOk', 'avisoCaixaErro')
  }

  const caixa = lerArq('caixa.json')
  caixa.push({
    id: Date.now(),
    data,
    hora,
    cliente,
    tipo,
    pagamento,
    valor,
    obs
  })

  salvarArq('caixa.json', caixa)
  aviso('ok', 'Movimento registrado no caixa.', 'avisoCaixaOk', 'avisoCaixaErro')

  document.getElementById('cxHora').value = new Date().toTimeString().slice(0, 5)
  document.getElementById('cxCliente').value = ''
  document.getElementById('cxTipo').value = 'Pagamento'
  document.getElementById('cxForma').value = 'Pix'
  document.getElementById('cxValor').value = ''
  document.getElementById('cxObs').value = ''

  renderCaixa()
}

async function excluirCaixa(id) {
  const ok = await confirmarAcao('Deseja excluir este movimento de caixa?', 'Excluir movimento')
  if (!ok) return
  salvarArq('caixa.json', lerArq('caixa.json').filter((m) => m.id !== id))
  renderCaixa()
}

function renderCaixa() {
  const caixa = [...lerArq('caixa.json')].sort((a, b) => {
    const da = new Date(`${a.data || '1970-01-01'}T${a.hora || '00:00'}`)
    const db = new Date(`${b.data || '1970-01-01'}T${b.hora || '00:00'}`)
    return db - da
  })

  const count = document.getElementById('countCaixa')
  if (count) count.textContent = `${caixa.length} movimento(s)`

  const tb = document.getElementById('tbodyCaixa')
  if (!tb) return

  tb.innerHTML = caixa.length
    ? caixa
        .map((m) => {
          const s = sinalCaixa(m)
          const valorFinal = Number(m.valor || 0) * s
          const badgeTipo = s > 0 ? 'b-green' : 'b-red'
          return `
      <tr>
        <td>${fmtData(m.data)}</td>
        <td>${m.hora || 'N/A'}</td>
        <td><b style="color:var(--fg)">${m.cliente || 'N/A'}</b></td>
        <td><span class="badge ${badgeTipo}">${m.tipo || 'Pagamento'}</span></td>
        <td><span class="badge b-purple">${m.pagamento || 'N/A'}</span></td>
        <td style="color:var(--muted);font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.obs || ''}</td>
        <td style="text-align:right;color:${s > 0 ? 'var(--green)' : 'var(--red)'};font-weight:700">${s > 0 ? '' : '-'}${fmtMoeda(Math.abs(valorFinal))}</td>
        <td style="text-align:center"><button class="btn-danger" onclick="excluirCaixa(${m.id})">Excluir</button></td>
      </tr>`
        })
        .join('')
    : '<tr><td colspan="8" class="empty">Nenhum movimento de caixa.</td></tr>'
}

document.getElementById('data').value = dataHoje()
document.getElementById('cxData').value = dataHoje()
document.getElementById('cxHora').value = new Date().toTimeString().slice(0, 5)
carregarServicos()
renderAgenda()
renderCaixa()
