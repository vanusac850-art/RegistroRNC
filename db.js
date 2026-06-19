/* ══════════════════════════════════════════
   db.js — Camada de acesso a dados (Supabase)
   Substitui o antigo localStorage por chamadas
   REST ao Supabase (PostgREST).
══════════════════════════════════════════ */

const REST_URL = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`;

function supaHeaders(extra) {
  return Object.assign({
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }, extra || {});
}

/**
 * Busca todos os registros, ordenados do mais recente para o mais antigo.
 * Retorna [] em caso de erro (e mostra um toast de aviso).
 */
async function loadRegistros() {
  try {
    const res = await fetch(`${REST_URL}?select=*&order=id.desc`, {
      headers: supaHeaders(),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Erro ao carregar RNCs:', res.status, errText);
      showToast('Erro ao carregar dados do servidor.');
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error('Falha de conexão ao carregar RNCs:', err);
    showToast('Sem conexão com o servidor.');
    return [];
  }
}

/**
 * Insere um novo registro. Retorna o registro criado (com id) ou null em erro.
 */
async function insertRegistro(registro) {
  try {
    const res = await fetch(REST_URL, {
      method: 'POST',
      headers: supaHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(registro),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Erro ao salvar RNC:', res.status, errText);
      showToast('Erro ao salvar no servidor.');
      return null;
    }
    const data = await res.json();
    return data[0] || null;
  } catch (err) {
    console.error('Falha de conexão ao salvar RNC:', err);
    showToast('Sem conexão com o servidor.');
    return null;
  }
}

/**
 * Exclui um registro pelo id. Retorna true/false.
 */
async function deleteRegistro(id) {
  try {
    const res = await fetch(`${REST_URL}?id=eq.${id}`, {
      method: 'DELETE',
      headers: supaHeaders(),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Erro ao excluir RNC:', res.status, errText);
      showToast('Erro ao excluir no servidor.');
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha de conexão ao excluir RNC:', err);
    showToast('Sem conexão com o servidor.');
    return false;
  }
}

/**
 * Conta quantos registros já existem com numero começando pelo ano informado.
 * Usado para gerar o próximo número sequencial.
 */
async function countByAno(ano) {
  try {
    const res = await fetch(
      `${REST_URL}?select=id&numero=like.${ano}-*`,
      { headers: supaHeaders({ 'Prefer': 'count=exact' }) }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.length;
  } catch {
    return 0;
  }
}
