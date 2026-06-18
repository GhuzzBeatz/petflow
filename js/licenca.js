const SALT_PF   = 'GHZ2026PETFLOW'
const LS_KEY_PF = '@PETFLOW:licenca'
const PREFIX_PF = 'PETFLOW'

function gerarChavePF(n) {
  const p1 = String(n).padStart(4, '0')
  const p2 = btoa(n + SALT_PF).replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase()
  const p3 = String((n * 17) % 9999).padStart(4, '0')
  return `${PREFIX_PF}-${p1}-${p2}-${p3}`
}

function validarChavePF(key) {
  if (!key) return false
  const clean  = key.trim().toUpperCase()
  const parts  = clean.split('-')
  if (parts.length !== 4 || parts[0] !== PREFIX_PF) return false
  const n = parseInt(parts[1])
  if (isNaN(n)) return false
  return gerarChavePF(n) === clean
}

function licencaAtivaPF() {
  try { return validarChavePF(localStorage.getItem(LS_KEY_PF) || '') }
  catch(e) { return false }
}

function salvarLicencaPF(key) {
  localStorage.setItem(LS_KEY_PF, key.trim().toUpperCase())
}
