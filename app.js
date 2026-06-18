/* ══════════════════════════════════════════
   RNC – Relatório de Não Conformidade
   app.js
══════════════════════════════════════════ */

// ── STORAGE ──────────────────────────────
const STORAGE_KEY = 'rnc_registros';

function loadRegistros() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveRegistros(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function nextNumero(list) {
  const ano = new Date().getFullYear();
  const seq = list.filter(r => r.numero && r.numero.startsWith(String(ano))).length + 1;
  return `${ano}-${String(seq).padStart(3, '0')}`;
}

// ── TABS ─────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelector(`.nav-item[data-tab="${name}"]`).classList.add('active');
  if (name === 'lista') renderLista();
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => switchTab(el.dataset.tab));
});

document.querySelectorAll('[data-tab-link]').forEach(el => {
  el.addEventListener('click', () => switchTab(el.dataset.tabLink));
});

// ── NÚMERO AUTOMÁTICO ─────────────────────
function updateNumeroDisplay() {
  const list = loadRegistros();
  const ano = new Date().getFullYear();
  const seq = list.filter(r => r.numero && r.numero.startsWith(String(ano))).length + 1;
  document.getElementById('rnc-numero').textContent =
    `${ano}-${String(seq).padStart(3, '0')}`;
}
updateNumeroDisplay();

// ── FORM SUBMIT ───────────────────────────
document.getElementById('form-rnc').addEventListener('submit', function (e) {
  e.preventDefault();
  const fd = new FormData(this);

  // Checkboxes (areas) — getAll
  const areas = Array.from(document.querySelectorAll('input[name="area"]:checked'))
    .map(el => el.value);

  const list = loadRegistros();
  const numero = nextNumero(list);

  const registro = {
    id: Date.now(),
    numero,
    tipo: fd.get('tipo') || '',
    classificacao: fd.get('classificacao') || '',
    areas,
    cliente_fornecedor: fd.get('cliente_fornecedor') || '',
    contato: fd.get('contato') || '',
    data_ocorrencia: fd.get('data_ocorrencia') || '',
    data_abertura: fd.get('data_abertura') || '',
    reincidente: fd.get('reincidente') || '',
    procedente: fd.get('procedente') || '',
    mudanca_sgi: fd.get('mudanca_sgi') || '',
    planilha_riscos: fd.get('planilha_riscos') || '',
    descricao_fato: fd.get('descricao_fato') || '',
    descricao_data: fd.get('descricao_data') || '',
    descricao_responsavel: fd.get('descricao_responsavel') || '',
    acao_imediata: fd.get('acao_imediata') || '',
    acao_imediata_data: fd.get('acao_imediata_data') || '',
    acao_imediata_responsavel: fd.get('acao_imediata_responsavel') || '',
    analise_causas: fd.get('analise_causas') || '',
    analise_causas_data: fd.get('analise_causas_data') || '',
    analise_causas_responsavel: fd.get('analise_causas_responsavel') || '',
    acao_corretiva: fd.get('acao_corretiva') || '',
    acao_corretiva_data: fd.get('acao_corretiva_data') || '',
    acao_corretiva_responsavel: fd.get('acao_corretiva_responsavel') || '',
    implementacao_acao: fd.get('implementacao_acao') || '',
    implementacao_data: fd.get('implementacao_data') || '',
    implementacao_responsavel: fd.get('implementacao_responsavel') || '',
    verificacao_eficacia: fd.get('verificacao_eficacia') || '',
    verificacao_data: fd.get('verificacao_data') || '',
    verificacao_responsavel: fd.get('verificacao_responsavel') || '',
    criado_em: new Date().toISOString(),
  };

  list.push(registro);
  saveRegistros(list);

  showToast(`RNC ${numero} salva com sucesso!`);
  this.reset();
  updateNumeroDisplay();
});

// ── LIMPAR FORM ───────────────────────────
document.getElementById('btn-limpar').addEventListener('click', () => {
  if (confirm('Limpar todos os campos?')) {
    document.getElementById('form-rnc').reset();
  }
});

// ── LISTA / RENDER ────────────────────────
let filtroAtivo = 'todos';
let buscaAtiva = '';

function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function badgeClass(cls) {
  if (cls === 'Crítica') return 'badge badge-c';
  if (cls === 'Maior')   return 'badge badge-m';
  if (cls === 'Menor')   return 'badge badge-mn';
  return 'badge';
}

function renderLista() {
  let list = loadRegistros();

  if (filtroAtivo !== 'todos') {
    list = list.filter(r => r.classificacao === filtroAtivo);
  }

  if (buscaAtiva.trim()) {
    const q = buscaAtiva.toLowerCase();
    list = list.filter(r =>
      (r.numero || '').toLowerCase().includes(q) ||
      (r.tipo || '').toLowerCase().includes(q) ||
      (r.cliente_fornecedor || '').toLowerCase().includes(q) ||
      (r.areas || []).join(' ').toLowerCase().includes(q) ||
      (r.descricao_fato || '').toLowerCase().includes(q)
    );
  }

  const empty = document.getElementById('empty-state');
  const tabela = document.getElementById('tabela-rnc');
  const body = document.getElementById('tabela-body');

  if (list.length === 0) {
    empty.style.display = '';
    tabela.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  tabela.style.display = '';

  // Sort newest first
  list.sort((a, b) => b.id - a.id);

  body.innerHTML = list.map(r => `
    <tr>
      <td><strong>${r.numero || '—'}</strong></td>
      <td>${formatDate(r.data_abertura)}</td>
      <td>${r.tipo || '—'}</td>
      <td>${r.classificacao ? `<span class="${badgeClass(r.classificacao)}">${r.classificacao}</span>` : '—'}</td>
      <td>${(r.areas || []).join(', ') || '—'}</td>
      <td>${r.cliente_fornecedor || '—'}</td>
      <td>${r.reincidente || '—'}</td>
      <td>
        <button class="btn-table" onclick="verRNC(${r.id})">Ver</button>
      </td>
    </tr>
  `).join('');
}

// ── FILTROS ───────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroAtivo = btn.dataset.filter;
    renderLista();
  });
});

document.getElementById('busca').addEventListener('input', e => {
  buscaAtiva = e.target.value;
  renderLista();
});

// ── MODAL: VER RNC ────────────────────────
function verRNC(id) {
  const list = loadRegistros();
  const r = list.find(x => x.id === id);
  if (!r) return;

  document.getElementById('modal-title').textContent = `RNC ${r.numero}`;

  const f = (v) => v || '—';
  const fd = (v) => formatDate(v) || '—';

  document.getElementById('modal-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Dados de Controle</div>
      <div class="detail-grid">
        <div class="detail-field"><label>Número</label><span>${f(r.numero)}</span></div>
        <div class="detail-field"><label>Data Abertura</label><span>${fd(r.data_abertura)}</span></div>
        <div class="detail-field"><label>Data Ocorrência</label><span>${fd(r.data_ocorrencia)}</span></div>
        <div class="detail-field"><label>Tipo</label><span>${f(r.tipo)}</span></div>
        <div class="detail-field"><label>Classificação</label><span>${r.classificacao ? `<span class="${badgeClass(r.classificacao)}">${r.classificacao}</span>` : '—'}</span></div>
        <div class="detail-field"><label>RNC Reincidente?</label><span>${f(r.reincidente)}</span></div>
        <div class="detail-field"><label>É Procedente?</label><span>${f(r.procedente)}</span></div>
        <div class="detail-field"><label>Mudança no SGI?</label><span>${f(r.mudanca_sgi)}</span></div>
        <div class="detail-field"><label>Planilha de Riscos?</label><span>${f(r.planilha_riscos)}</span></div>
        <div class="detail-field"><label>Cliente / Fornecedor</label><span>${f(r.cliente_fornecedor)}</span></div>
        <div class="detail-field"><label>Contato</label><span>${f(r.contato)}</span></div>
        <div class="detail-field" style="grid-column:1/-1"><label>Áreas de Atuação</label><span>${(r.areas || []).join(', ') || '—'}</span></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Descrição do Fato Ocorrido</div>
      <div class="detail-text">${f(r.descricao_fato)}</div>
      <div class="detail-grid" style="margin-top:10px">
        <div class="detail-field"><label>Data</label><span>${fd(r.descricao_data)}</span></div>
        <div class="detail-field"><label>Responsável</label><span>${f(r.descricao_responsavel)}</span></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Ação Imediata</div>
      <div class="detail-text">${f(r.acao_imediata)}</div>
      <div class="detail-grid" style="margin-top:10px">
        <div class="detail-field"><label>Data</label><span>${fd(r.acao_imediata_data)}</span></div>
        <div class="detail-field"><label>Responsável</label><span>${f(r.acao_imediata_responsavel)}</span></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Análise das Causas</div>
      <div class="detail-text">${f(r.analise_causas)}</div>
      <div class="detail-grid" style="margin-top:10px">
        <div class="detail-field"><label>Data</label><span>${fd(r.analise_causas_data)}</span></div>
        <div class="detail-field"><label>Responsável</label><span>${f(r.analise_causas_responsavel)}</span></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Ação Corretiva</div>
      <div class="detail-text">${f(r.acao_corretiva)}</div>
      <div class="detail-grid" style="margin-top:10px">
        <div class="detail-field"><label>Data</label><span>${fd(r.acao_corretiva_data)}</span></div>
        <div class="detail-field"><label>Responsável</label><span>${f(r.acao_corretiva_responsavel)}</span></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Implementação da Ação Corretiva</div>
      <div class="detail-text">${f(r.implementacao_acao)}</div>
      <div class="detail-grid" style="margin-top:10px">
        <div class="detail-field"><label>Data</label><span>${fd(r.implementacao_data)}</span></div>
        <div class="detail-field"><label>Responsável</label><span>${f(r.implementacao_responsavel)}</span></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Verificação da Eficácia da Ação Corretiva</div>
      <div class="detail-text">${f(r.verificacao_eficacia)}</div>
      <div class="detail-grid" style="margin-top:10px">
        <div class="detail-field"><label>Data</label><span>${fd(r.verificacao_data)}</span></div>
        <div class="detail-field"><label>Responsável</label><span>${f(r.verificacao_responsavel)}</span></div>
      </div>
    </div>
  `;

  // Store current id for delete
  document.getElementById('modal').dataset.currentId = id;
  document.getElementById('modal').style.display = 'flex';
}

// ── MODAL CLOSE ───────────────────────────
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-close2').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});

// ── MODAL DELETE ──────────────────────────
document.getElementById('modal-excluir').addEventListener('click', () => {
  const id = Number(document.getElementById('modal').dataset.currentId);
  if (!id) return;
  if (!confirm('Excluir esta RNC permanentemente?')) return;
  let list = loadRegistros();
  list = list.filter(r => r.id !== id);
  saveRegistros(list);
  closeModal();
  renderLista();
  showToast('RNC excluída.');
});

// ── MODAL PRINT ───────────────────────────
document.getElementById('modal-imprimir').addEventListener('click', () => {
  window.print();
});

// ── TOAST ─────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── EXPOSE verRNC globally ────────────────
window.verRNC = verRNC;
