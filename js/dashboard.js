aplicarTemaAtual()

const agenda = lerArq('agenda.json')
const clientes = lerArq('clientes.json')
const animais = lerArq('animais.json')
const produtos = lerArq('produtos.json')

const atendidos = agenda.filter((a) => jaPassou(a.data, a.hora))
const pendentes = agenda.filter((a) => !jaPassou(a.data, a.hora))
const alertasEstoque = produtos.filter((p) => Number(p.estoque || 0) <= Number(p.estoqueMin || 0))

function coletarAlertasVacinas() {
  const hoje = new Date()
  const alertas = []

  animais.forEach((animal) => {
    const vacinas = Array.isArray(animal.vacinas) ? animal.vacinas : []

    vacinas.forEach((v) => {
      if (!v.proxima) return

      const dtProxima = new Date(v.proxima)
      const diffDias = Math.ceil((dtProxima - hoje) / (1000 * 60 * 60 * 24))

      if (diffDias < 0) {
        alertas.push({
          animal: animal.nome || 'N/A',
          dono: animal.donoNome || 'N/A',
          vacina: v.nome || 'Vacina',
          proxima: v.proxima,
          status: 'Vencida',
          prioridade: 0
        })
      } else if (diffDias <= 30) {
        alertas.push({
          animal: animal.nome || 'N/A',
          dono: animal.donoNome || 'N/A',
          vacina: v.nome || 'Vacina',
          proxima: v.proxima,
          status: `Vence em ${diffDias} dia(s)`,
          prioridade: 1
        })
      }
    })
  })

  return alertas.sort((a, b) => {
    if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade
    return new Date(a.proxima) - new Date(b.proxima)
  })
}

const alertasVacina = coletarAlertasVacinas()

document.getElementById('kpiCli').textContent = clientes.length
document.getElementById('kpiAni').textContent = animais.length
document.getElementById('kpiAtend').textContent = atendidos.length
document.getElementById('kpiAguard').textContent = pendentes.length
document.getElementById('kpiFat').textContent = fmtMoeda(atendidos.reduce((s, a) => s + Number(a.valor || 0), 0))
document.getElementById('kpiAlerta').textContent = alertasEstoque.length
document.getElementById('kpiVacinas').textContent = alertasVacina.length

const proximos = [...pendentes]
  .sort((a, b) => new Date(a.data + 'T' + (a.hora || '00:00')) - new Date(b.data + 'T' + (b.hora || '00:00')))
  .slice(0, 8)

document.getElementById('tbProximos').innerHTML = proximos.length
  ? proximos
      .map(
        (a) => `
    <tr>
      <td>${fmtData(a.data)}</td>
      <td>${a.hora || 'N/A'}</td>
      <td><b style="color:var(--fg)">${a.cliente || 'N/A'}</b></td>
      <td><span style="color:var(--muted);font-size:12px">${a.animal || 'N/A'}</span></td>
      <td><span class="badge b-blue">${a.servico || 'N/A'}</span></td>
      <td style="text-align:right;color:var(--primary);font-weight:700">${fmtMoeda(a.valor)}</td>
    </tr>`
      )
      .join('')
  : '<tr><td colspan="6" class="empty">Nenhum agendamento futuro.</td></tr>'

const ultimos = [...atendidos]
  .sort((a, b) => new Date(b.data + 'T' + (b.hora || '00:00')) - new Date(a.data + 'T' + (a.hora || '00:00')))
  .slice(0, 8)

document.getElementById('tbAtendidos').innerHTML = ultimos.length
  ? ultimos
      .map(
        (a) => `
    <tr>
      <td>${fmtData(a.data)}</td>
      <td>${a.hora || 'N/A'}</td>
      <td><b style="color:var(--fg)">${a.cliente || 'N/A'}</b></td>
      <td><span style="color:var(--muted);font-size:12px">${a.animal || 'N/A'}</span></td>
      <td><span class="badge b-green">${a.servico || 'N/A'}</span></td>
      <td style="text-align:right;color:var(--green);font-weight:700">${fmtMoeda(a.valor)}</td>
    </tr>`
      )
      .join('')
  : '<tr><td colspan="6" class="empty">Nenhum atendimento realizado ainda.</td></tr>'

const tbVacinas = document.getElementById('tbVacinas')
if (tbVacinas) {
  tbVacinas.innerHTML = alertasVacina.length
    ? alertasVacina
        .map((v) => {
          const badgeClass = v.status === 'Vencida' ? 'b-red' : 'b-orange'
          return `
          <tr>
            <td><b style="color:var(--fg)">${v.animal}</b></td>
            <td>${v.dono}</td>
            <td>${v.vacina}</td>
            <td>${fmtData(v.proxima)}</td>
            <td><span class="badge ${badgeClass}">${v.status}</span></td>
          </tr>`
        })
        .join('')
    : '<tr><td colspan="5" class="empty">Sem vacinas vencidas ou proximas.</td></tr>'
}

const tbAl = document.getElementById('tbAlertas')
if (tbAl) {
  tbAl.innerHTML = alertasEstoque.length
    ? alertasEstoque
        .map(
          (p) => `
      <tr>
        <td><b style="color:var(--fg)">${p.nome}</b></td>
        <td><span class="badge b-red">Estoque: ${p.estoque || 0}</span></td>
        <td style="color:var(--muted);font-size:12px">Min: ${p.estoqueMin || 0}</td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="3" class="empty">Todos os produtos com estoque ok.</td></tr>'
}
