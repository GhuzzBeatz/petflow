// Gerenciador de tema — lê/salva no localStorage, aplica na página
const THEME_KEY = '@PETFLOW:tema'

function getTema() {
  return localStorage.getItem(THEME_KEY) || 'dark'
}

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema)
  localStorage.setItem(THEME_KEY, tema)
}

function toggleTema() {
  const atual = getTema()
  const novo  = atual === 'dark' ? 'light' : 'dark'
  aplicarTema(novo)
  // Atualiza ícone se existir na página
  const btn = document.getElementById('btnTema')
  if (btn) btn.textContent = novo === 'dark' ? '☀️' : '🌙'
  return novo
}

// Aplica automaticamente ao carregar qualquer página
;(function() {
  aplicarTema(getTema())
})()
