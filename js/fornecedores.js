aplicarTemaAtual()
let editandoId = null

function salvar() {
  const nome     = document.getElementById('nome').value.trim()
  const cnpj     = document.getElementById('cnpj').value.trim()
  const telefone = document.getElementById('telefone').value.trim()
  const email    = document.getElementById('email').value.trim()
  const contato  = document.getElementById('contato').value.trim()
  const obs      = document.getElementById('obs').value.trim()
  if (!nome) return aviso('erro','Informe o nome do fornecedor.')

  let lista = lerArq('fornecedores.json')
  if (editandoId) {
    lista = lista.map(f => f.id===editandoId ? {...f,nome,cnpj,telefone,email,contato,obs} : f)
    aviso('ok','Fornecedor atualizado!'); cancelar()
  } else {
    lista.push({id:Date.now(),nome,cnpj,telefone,email,contato,obs})
    aviso('ok',`"${nome}" cadastrado!`); limpar()
  }
  salvarArq('fornecedores.json',lista); renderFornecedores()
}

function editar(id) {
  const f = lerArq('fornecedores.json').find(x=>x.id===id)
  if (!f) return
  document.getElementById('nome').value     = f.nome
  document.getElementById('cnpj').value     = f.cnpj||''
  document.getElementById('telefone').value = f.telefone||''
  document.getElementById('email').value    = f.email||''
  document.getElementById('contato').value  = f.contato||''
  document.getElementById('obs').value      = f.obs||''
  document.getElementById('formTitulo').textContent = '✏️ Editar Fornecedor'
  document.getElementById('btnSalvar').textContent  = '💾 Salvar Alteração'
  document.getElementById('btnCancelar').style.display = 'inline-flex'
  editandoId = id; window.scrollTo({top:0,behavior:'smooth'})
}

function cancelar() {
  limpar(); editandoId=null
  document.getElementById('formTitulo').textContent = 'Novo Fornecedor'
  document.getElementById('btnSalvar').textContent  = '+ Salvar Fornecedor'
  document.getElementById('btnCancelar').style.display = 'none'
}

function limpar() {
  ['nome','cnpj','telefone','email','contato','obs'].forEach(id => document.getElementById(id).value='')
}

function excluir(id) {
  salvarArq('fornecedores.json',lerArq('fornecedores.json').filter(f=>f.id!==id))
  renderFornecedores()
}

function renderFornecedores() {
  const busca = (document.getElementById('busca')?.value||'').toLowerCase()
  const lista = lerArq('fornecedores.json').filter(f =>
    !busca || f.nome.toLowerCase().includes(busca)||(f.cnpj||'').includes(busca)
  )
  const ct = document.getElementById('count')
  if (ct) ct.textContent = lerArq('fornecedores.json').length+' fornecedor(es)'
  const tb = document.getElementById('tbody')
  if (!tb) return
  tb.innerHTML = lista.length ? lista.map(f=>`
    <tr>
      <td><b style="color:var(--fg)">${f.nome}</b></td>
      <td style="color:var(--muted);font-size:12px">${f.cnpj||'—'}</td>
      <td>${f.telefone||'—'}</td>
      <td style="color:var(--muted);font-size:12px">${f.email||'—'}</td>
      <td style="color:var(--muted);font-size:12px">${f.contato||'—'}</td>
      <td style="text-align:center;white-space:nowrap">
        <button class="btn-edit" onclick="editar(${f.id})">✏️</button>
        <button class="btn-danger" onclick="excluir(${f.id})">🗑️</button>
      </td>
    </tr>`).join('')
  : '<tr><td colspan="6" class="empty">Nenhum fornecedor cadastrado.</td></tr>'
}

renderFornecedores()
