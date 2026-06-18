aplicarTemaAtual()
let editandoId = null

function salvar() {
  const nome       = document.getElementById('nome').value.trim()
  const categoria  = document.getElementById('categoria').value.trim()
  const preco      = document.getElementById('preco').value
  const estoque    = document.getElementById('estoque').value
  const estoqueMin = document.getElementById('estoqueMin').value
  const fornId     = document.getElementById('fornecedor').value
  const obs        = document.getElementById('obs').value.trim()

  if (!nome)  return aviso('erro','Informe o nome do produto.')
  if (!preco || Number(preco)<=0) return aviso('erro','Informe um preço válido.')

  let lista = lerArq('produtos.json')
  if (editandoId) {
    lista = lista.map(p => p.id===editandoId ? { ...p, nome, categoria, preco:Number(preco), estoque:Number(estoque||0), estoqueMin:Number(estoqueMin||0), fornId, obs } : p)
    aviso('ok','Produto atualizado!'); cancelar()
  } else {
    lista.push({ id:Date.now(), nome, categoria, preco:Number(preco), estoque:Number(estoque||0), estoqueMin:Number(estoqueMin||0), fornId, obs })
    aviso('ok',`"${nome}" cadastrado!`); limpar()
  }
  salvarArq('produtos.json', lista)
  renderProdutos()
}

function editar(id) {
  const p = lerArq('produtos.json').find(x => x.id===id)
  if (!p) return
  document.getElementById('nome').value       = p.nome
  document.getElementById('categoria').value  = p.categoria||''
  document.getElementById('preco').value      = p.preco
  document.getElementById('estoque').value    = p.estoque||0
  document.getElementById('estoqueMin').value = p.estoqueMin||0
  document.getElementById('fornecedor').value = p.fornId||''
  document.getElementById('obs').value        = p.obs||''
  document.getElementById('formTitulo').textContent = '✏️ Editar Produto'
  document.getElementById('btnSalvar').textContent  = '💾 Salvar Alteração'
  document.getElementById('btnCancelar').style.display = 'inline-flex'
  editandoId = id; window.scrollTo({top:0,behavior:'smooth'})
}

function cancelar() {
  limpar(); editandoId=null
  document.getElementById('formTitulo').textContent = 'Novo Produto'
  document.getElementById('btnSalvar').textContent  = '+ Salvar Produto'
  document.getElementById('btnCancelar').style.display = 'none'
}

function limpar() {
  ['nome','categoria','preco','estoque','estoqueMin','obs'].forEach(id => document.getElementById(id).value='')
  document.getElementById('fornecedor').value = ''
}

function excluir(id) {
  salvarArq('produtos.json', lerArq('produtos.json').filter(p => p.id!==id))
  renderProdutos()
}

function carregarFornecedores() {
  const sel   = document.getElementById('fornecedor')
  const forns = lerArq('fornecedores.json')
  sel.innerHTML = '<option value="">Sem fornecedor</option>'
  forns.forEach(f => sel.innerHTML += `<option value="${f.id}">${f.nome}</option>`)
}

function renderProdutos() {
  const busca  = (document.getElementById('busca')?.value||'').toLowerCase()
  const filtro = document.getElementById('filtroCat')?.value||''
  let lista    = lerArq('produtos.json')
  if (busca)  lista = lista.filter(p => p.nome.toLowerCase().includes(busca)||(p.categoria||'').toLowerCase().includes(busca))
  if (filtro) lista = lista.filter(p => (p.categoria||'')=== filtro)

  const ct = document.getElementById('count')
  if (ct) ct.textContent = lerArq('produtos.json').length+' produto(s)'

  // categorias para filtro
  const cats = [...new Set(lerArq('produtos.json').map(p=>p.categoria).filter(Boolean))]
  const filtroCat = document.getElementById('filtroCat')
  if (filtroCat) {
    const cur = filtroCat.value
    filtroCat.innerHTML = '<option value="">Todas categorias</option>' + cats.map(c=>`<option ${c===cur?'selected':''}>${c}</option>`).join('')
  }

  const tb = document.getElementById('tbody')
  if (!tb) return
  tb.innerHTML = lista.length ? lista.map(p => {
    const alerta = Number(p.estoque||0) <= Number(p.estoqueMin||0)
    return `
    <tr>
      <td><b style="color:var(--fg)">${p.nome}</b></td>
      <td><span class="badge b-blue">${p.categoria||'—'}</span></td>
      <td style="text-align:right;color:var(--primary);font-weight:700">${fmtMoeda(p.preco)}</td>
      <td style="text-align:center">
        <span class="badge ${alerta?'b-red':'b-green'}">${p.estoque||0} ${alerta?'⚠':'✓'}</span>
      </td>
      <td style="text-align:center;color:var(--muted);font-size:12px">${p.estoqueMin||0}</td>
      <td style="text-align:center;white-space:nowrap">
        <button class="btn-edit" onclick="editar(${p.id})">✏️</button>
        <button class="btn-danger" onclick="excluir(${p.id})">🗑️</button>
      </td>
    </tr>`
  }).join('')
  : '<tr><td colspan="6" class="empty">Nenhum produto encontrado.</td></tr>'
}

carregarFornecedores()
renderProdutos()
