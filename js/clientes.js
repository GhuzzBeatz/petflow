aplicarTemaAtual()

let editandoId = null

function salvarCliente() {
  const nome = document.getElementById('nome').value.trim()
  const telefone = document.getElementById('telefone').value.trim()
  const cpf = document.getElementById('cpf').value.trim()
  const email = document.getElementById('email').value.trim()
  const dataNascimento = document.getElementById('dataNascimento').value
  const endereco = document.getElementById('endereco').value.trim()
  const obs = document.getElementById('obs').value.trim()

  if (!nome) return aviso('erro', 'Informe o nome do cliente.')

  let lista = lerArq('clientes.json')

  if (editandoId) {
    lista = lista.map((c) =>
      c.id === editandoId
        ? { ...c, nome, telefone, cpf, email, dataNascimento, endereco, obs }
        : c
    )
    aviso('ok', 'Cliente atualizado!')
    cancelar()
  } else {
    lista.push({
      id: Date.now(),
      nome,
      telefone,
      cpf,
      email,
      dataNascimento,
      endereco,
      obs
    })
    aviso('ok', `Cliente "${nome}" cadastrado!`)
    limpar()
  }

  salvarArq('clientes.json', lista)
  try {
    localStorage.setItem('@PETFLOW:clientes-cache', JSON.stringify(lista))
  } catch (e) {}
  renderClientes()
}

function editar(id) {
  const c = lerArq('clientes.json').find((x) => x.id === id)
  if (!c) return

  document.getElementById('nome').value = c.nome || ''
  document.getElementById('telefone').value = c.telefone || ''
  document.getElementById('cpf').value = c.cpf || ''
  document.getElementById('email').value = c.email || ''
  document.getElementById('dataNascimento').value = c.dataNascimento || ''
  document.getElementById('endereco').value = c.endereco || ''
  document.getElementById('obs').value = c.obs || ''

  document.getElementById('formTitulo').textContent = 'Editar Cliente'
  document.getElementById('btnSalvar').textContent = 'Salvar Alteracao'
  document.getElementById('btnCancelar').style.display = 'inline-flex'

  editandoId = id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelar() {
  limpar()
  editandoId = null
  document.getElementById('formTitulo').textContent = 'Novo Cliente'
  document.getElementById('btnSalvar').textContent = '+ Salvar Cliente'
  document.getElementById('btnCancelar').style.display = 'none'
}

function limpar() {
  ;['nome', 'telefone', 'cpf', 'email', 'dataNascimento', 'endereco', 'obs'].forEach((id) => {
    document.getElementById(id).value = ''
  })
}

function excluir(id) {
  const novaLista = lerArq('clientes.json').filter((c) => c.id !== id)
  salvarArq('clientes.json', novaLista)
  try {
    localStorage.setItem('@PETFLOW:clientes-cache', JSON.stringify(novaLista))
  } catch (e) {}
  renderClientes()
}

function renderClientes() {
  const termo = (document.getElementById('busca')?.value || '').toLowerCase().trim()
  const todos = lerArq('clientes.json')
  try {
    localStorage.setItem('@PETFLOW:clientes-cache', JSON.stringify(todos))
  } catch (e) {}

  const lista = todos.filter((c) => {
    if (!termo) return true
    return (
      String(c.nome || '').toLowerCase().includes(termo) ||
      String(c.telefone || '').toLowerCase().includes(termo) ||
      String(c.cpf || '').toLowerCase().includes(termo) ||
      String(c.email || '').toLowerCase().includes(termo) ||
      String(c.endereco || '').toLowerCase().includes(termo)
    )
  })

  const ct = document.getElementById('count')
  if (ct) ct.textContent = `${lista.length} de ${todos.length} cliente(s)`

  const tb = document.getElementById('tbody')
  if (!tb) return

  tb.innerHTML = lista.length
    ? lista
        .map(
          (c) => `
      <tr>
        <td><b style="color:var(--fg)">${c.nome || 'N/A'}</b></td>
        <td>${c.telefone || 'N/A'}</td>
        <td style="color:var(--muted);font-size:12px">${c.cpf || 'N/A'}</td>
        <td style="color:var(--muted);font-size:12px">${c.email || 'N/A'}</td>
        <td style="color:var(--muted);font-size:12px">${c.dataNascimento ? fmtData(c.dataNascimento) : 'N/A'}</td>
        <td style="color:var(--muted);font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.endereco || 'N/A'}</td>
        <td style="color:var(--muted);font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.obs || 'N/A'}</td>
        <td style="text-align:center;white-space:nowrap">
          <button class="btn-edit" onclick="editar(${c.id})" title="Editar">Editar</button>
          <button class="btn-danger" onclick="excluir(${c.id})" title="Excluir">Excluir</button>
        </td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="8" class="empty">Nenhum cliente encontrado.</td></tr>'
}

renderClientes()
