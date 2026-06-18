aplicarTemaAtual()

let editandoId = null

function salvar() {
  const nome = document.getElementById('nome').value.trim()
  const tipo = document.getElementById('tipo').value
  const preco = document.getElementById('preco').value
  const duracao = document.getElementById('duracao').value.trim()
  const obs = document.getElementById('obs').value.trim()

  if (!nome) return aviso('erro', 'Informe o nome do servico.')
  if (!preco || Number(preco) <= 0) return aviso('erro', 'Informe um valor valido.')

  let lista = lerArq('servicos.json')

  if (editandoId) {
    lista = lista.map((s) =>
      s.id === editandoId
        ? { ...s, nome, tipo, preco: Number(preco), duracao, obs }
        : s
    )
    aviso('ok', 'Servico atualizado!')
    cancelar()
  } else {
    if (lista.find((s) => String(s.nome || '').toLowerCase() === nome.toLowerCase())) {
      return aviso('erro', 'Ja existe um servico com esse nome.')
    }
    lista.push({ id: Date.now(), nome, tipo, preco: Number(preco), duracao, obs })
    aviso('ok', `"${nome}" cadastrado!`)
    limpar()
  }

  salvarArq('servicos.json', lista)
  renderServicos()
}

function editar(id) {
  const s = lerArq('servicos.json').find((x) => x.id === id)
  if (!s) return

  document.getElementById('nome').value = s.nome || ''
  document.getElementById('tipo').value = s.tipo || ''
  document.getElementById('preco').value = s.preco || ''
  document.getElementById('duracao').value = s.duracao || ''
  document.getElementById('obs').value = s.obs || ''

  document.getElementById('formTitulo').textContent = 'Editar Servico'
  document.getElementById('btnSalvar').textContent = 'Salvar Alteracao'
  document.getElementById('btnCancelar').style.display = 'inline-flex'

  editandoId = id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelar() {
  limpar()
  editandoId = null
  document.getElementById('formTitulo').textContent = 'Novo Servico'
  document.getElementById('btnSalvar').textContent = '+ Salvar Servico'
  document.getElementById('btnCancelar').style.display = 'none'
}

function limpar() {
  ;['nome', 'tipo', 'preco', 'duracao', 'obs'].forEach((id) => {
    document.getElementById(id).value = ''
  })
}

function excluir(id) {
  salvarArq('servicos.json', lerArq('servicos.json').filter((s) => s.id !== id))
  renderServicos()
}

function renderServicos() {
  const termo = (document.getElementById('buscaServico')?.value || '').toLowerCase().trim()
  const todos = lerArq('servicos.json')

  const lista = todos.filter((s) => {
    if (!termo) return true
    return (
      String(s.nome || '').toLowerCase().includes(termo) ||
      String(s.tipo || '').toLowerCase().includes(termo) ||
      String(s.obs || '').toLowerCase().includes(termo)
    )
  })

  const ct = document.getElementById('count')
  if (ct) ct.textContent = `${lista.length} de ${todos.length} servico(s)`

  const tb = document.getElementById('tbody')
  if (!tb) return

  tb.innerHTML = lista.length
    ? lista
        .map(
          (s) => `
      <tr>
        <td><b style="color:var(--fg)">${s.nome}</b></td>
        <td><span class="badge b-purple">${s.tipo || 'N/A'}</span></td>
        <td style="text-align:right;color:var(--green);font-weight:700">${fmtMoeda(s.preco)}</td>
        <td style="color:var(--muted);font-size:12px;text-align:center">${s.duracao || 'N/A'}</td>
        <td style="color:var(--muted);font-size:12px">${s.obs || 'N/A'}</td>
        <td style="text-align:center;white-space:nowrap">
          <button class="btn-edit" onclick="editar(${s.id})">Editar</button>
          <button class="btn-danger" onclick="excluir(${s.id})">Excluir</button>
        </td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="empty">Nenhum servico cadastrado.</td></tr>'
}

renderServicos()
