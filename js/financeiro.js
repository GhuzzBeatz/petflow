aplicarTemaAtual()

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]

function normalizarMovimentos() {
  const agenda = lerArq('agenda.json')
    .filter((a) => jaPassou(a.data, a.hora))
    .map((a) => ({
      origem: 'Agenda',
      tipo: 'Atendimento',
      data: a.data,
      hora: a.hora,
      cliente: a.cliente || 'N/A',
      animal: a.animal || 'N/A',
      referencia: a.servico || 'N/A',
      pagamento: a.pagamento || 'A definir',
      valor: Number(a.valor || 0)
    }))

  const caixa = lerArq('caixa.json').map((m) => {
    const tipo = m.tipo || 'Pagamento'
    const isEstorno = String(tipo).toLowerCase() === 'estorno'
    return {
      origem: 'Caixa',
      tipo,
      data: m.data,
      hora: m.hora || '',
      cliente: m.cliente || 'N/A',
      animal: '-',
      referencia: m.obs || 'Movimento manual',
      pagamento: m.pagamento || 'N/A',
      valor: (isEstorno ? -1 : 1) * Number(m.valor || 0)
    }
  })

  return [...agenda, ...caixa]
}

function renderFinanceiro() {
  const filtroMes = document.getElementById('filtroMes').value
  const filtroPagamento = document.getElementById('filtroPagamento').value

  const todos = normalizarMovimentos()

  let dados = filtroMes
    ? todos.filter((a) => String(a.data || '').startsWith(filtroMes))
    : todos

  if (filtroPagamento) {
    dados = dados.filter((a) => (a.pagamento || 'A definir') === filtroPagamento)
  }

  dados = [...dados].sort(
    (a, b) => new Date(b.data + 'T' + (b.hora || '00:00')) - new Date(a.data + 'T' + (a.hora || '00:00'))
  )

  const totalCard = dados.reduce((s, a) => s + Number(a.valor || 0), 0)
  const hoje = new Date()
  const anoMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const totalMesAtual = todos
    .filter((a) => String(a.data || '').startsWith(anoMesAtual))
    .reduce((s, a) => s + Number(a.valor || 0), 0)

  const positivos = dados.filter((d) => Number(d.valor || 0) > 0)
  const ticket = positivos.length ? positivos.reduce((s, a) => s + Number(a.valor || 0), 0) / positivos.length : 0

  const labelCard = filtroMes
    ? (() => {
        const [ano, mes] = filtroMes.split('-')
        return `${MESES[Number(mes) - 1]} ${ano}`
      })()
    : 'todos os periodos'

  document.getElementById('kpiTotal').textContent = fmtMoeda(totalCard)
  document.getElementById('kpiTotalLabel').textContent = labelCard
  document.getElementById('kpiMes').textContent = fmtMoeda(totalMesAtual)
  document.getElementById('kpiMesLabel').textContent = `${MESES[hoje.getMonth()]} ${hoje.getFullYear()}`
  document.getElementById('kpiTicket').textContent = fmtMoeda(ticket)

  const ct = document.getElementById('count')
  if (ct) ct.textContent = `${dados.length} movimento(s)`

  const tb = document.getElementById('tbody')
  if (!tb) return

  tb.innerHTML = dados.length
    ? dados
        .map(
          (a) => `
      <tr>
        <td>${fmtData(a.data)}</td>
        <td>${a.hora || 'N/A'}</td>
        <td><b style="color:var(--fg)">${a.cliente || 'N/A'}</b></td>
        <td style="color:var(--muted);font-size:12px">${a.animal || 'N/A'}</td>
        <td><span class="badge b-blue">${a.referencia || 'N/A'}</span></td>
        <td><span class="badge ${Number(a.valor || 0) < 0 ? 'b-red' : 'b-green'}">${a.tipo || 'Pagamento'}</span></td>
        <td><span class="badge b-purple">${a.pagamento || 'A definir'}</span></td>
        <td style="text-align:right;color:${Number(a.valor || 0) < 0 ? 'var(--red)' : 'var(--green)'};font-weight:700">${Number(a.valor || 0) < 0 ? '-' : ''}${fmtMoeda(Math.abs(Number(a.valor || 0)))}</td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="8" class="empty">Nenhum movimento encontrado neste periodo.</td></tr>'
}

function limparFiltro() {
  document.getElementById('filtroMes').value = ''
  document.getElementById('filtroPagamento').value = ''
  renderFinanceiro()
}

const hoje = new Date()
document.getElementById('filtroMes').value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
renderFinanceiro()
