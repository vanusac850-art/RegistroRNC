/* ══════════════════════════════════════════
   RNC – Relatório de Não Conformidade
   app.js
   (dados agora vêm do Supabase — ver db.js)
══════════════════════════════════════════ */

async function nextNumero() {
  const ano = new Date().getFullYear();
  const seq = (await countByAno(ano)) + 1;
  return `${ano}-${String(seq).padStart(3, '0')}`;
}

const AREA_COLORS = {
  'Direção/SGI': 'var(--c1)', 'Financeiro': 'var(--c2)', 'Comercial': 'var(--c3)',
  'ADM. Vassouras': 'var(--c4)', 'Obras': 'var(--c5)', 'SST': 'var(--c6)',
  'Recursos Humanos': 'var(--c7)', 'Mobilização': 'var(--c8)', 'Suprimentos': 'var(--c9)',
  'DP': 'var(--c10)', 'Almoxarifado': 'var(--c11)', 'Logística': 'var(--c12)',
  'Gestão de Ativos': 'var(--c13)'
};
const TIPO_COLORS = {
  'Rotina': 'var(--c2)', 'Reclamação de Cliente': 'var(--c1)',
  'Auditoria Interna': 'var(--c4)', 'Auditoria Externa': 'var(--c5)'
};

// ── TABS ─────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelector(`.nav-item[data-tab="${name}"]`).classList.add('active');
  if (name === 'lista') renderLista();
  if (name === 'dashboard') renderDashboard();
}
document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => switchTab(el.dataset.tab)));
document.querySelectorAll('[data-tab-link]').forEach(el => el.addEventListener('click', () => switchTab(el.dataset.tabLink)));

// ── NÚMERO AUTOMÁTICO ─────────────────────
async function updateNumeroDisplay() {
  const ano = new Date().getFullYear();
  const seq = (await countByAno(ano)) + 1;
  document.getElementById('rnc-numero').textContent = `${ano}-${String(seq).padStart(3, '0')}`;
}
updateNumeroDisplay();

// ── FORM SUBMIT ───────────────────────────
document.getElementById('form-rnc').addEventListener('submit', async function (e) {
  e.preventDefault();
  const submitBtn = this.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  const fd = new FormData(this);
  const areas = Array.from(document.querySelectorAll('input[name="area"]:checked')).map(el => el.value);
  const numero = await nextNumero();

  const registro = {
    numero,
    tipo: fd.get('tipo') || '',
    classificacao: fd.get('classificacao') || '',
    areas,
    cliente_fornecedor: fd.get('cliente_fornecedor') || '',
    contato: fd.get('contato') || '',
    data_ocorrencia: fd.get('data_ocorrencia') || null,
    data_abertura: fd.get('data_abertura') || null,
    reincidente: fd.get('reincidente') || '',
    procedente: fd.get('procedente') || '',
    mudanca_sgi: fd.get('mudanca_sgi') || '',
    planilha_riscos: fd.get('planilha_riscos') || '',
    descricao_fato: fd.get('descricao_fato') || '',
    descricao_data: fd.get('descricao_data') || null,
    descricao_responsavel: fd.get('descricao_responsavel') || '',
    acao_imediata: fd.get('acao_imediata') || '',
    acao_imediata_data: fd.get('acao_imediata_data') || null,
    acao_imediata_responsavel: fd.get('acao_imediata_responsavel') || '',
    analise_causas: fd.get('analise_causas') || '',
    analise_causas_data: fd.get('analise_causas_data') || null,
    analise_causas_responsavel: fd.get('analise_causas_responsavel') || '',
    acao_corretiva: fd.get('acao_corretiva') || '',
    acao_corretiva_data: fd.get('acao_corretiva_data') || null,
    acao_corretiva_responsavel: fd.get('acao_corretiva_responsavel') || '',
    implementacao_acao: fd.get('implementacao_acao') || '',
    implementacao_data: fd.get('implementacao_data') || null,
    implementacao_responsavel: fd.get('implementacao_responsavel') || '',
    verificacao_eficacia: fd.get('verificacao_eficacia') || '',
    verificacao_data: fd.get('verificacao_data') || null,
    verificacao_responsavel: fd.get('verificacao_responsavel') || '',
  };

  const saved = await insertRegistro(registro);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Salvar RNC';

  if (saved) {
    showToast(`RNC ${numero} salva com sucesso!`);
    this.reset();
    updateNumeroDisplay();
  }
});

document.getElementById('btn-limpar').addEventListener('click', () => {
  openConfirm('Limpar formulário?', 'Todos os campos preenchidos serão perdidos.', () => {
    document.getElementById('form-rnc').reset();
  });
});

// ── LISTA / RENDER ────────────────────────
let filtroAtivo = 'todos';
let buscaAtiva = '';
let filtroMes = 'todos';
let filtroAno = 'todos';

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

async function populateListaAno(list) {
  const anos = new Set();
  list.forEach(r => { if (r.data_abertura) anos.add(r.data_abertura.split('-')[0]); });
  const sel = document.getElementById('lista-ano');
  const anosArr = Array.from(anos).sort((a, b) => b - a);
  const prevValue = sel.value || filtroAno;
  sel.innerHTML = `<option value="todos">Todos os anos</option>` +
    anosArr.map(a => `<option value="${a}">${a}</option>`).join('');
  sel.value = anosArr.includes(prevValue) ? prevValue : 'todos';
  filtroAno = sel.value;
}

async function renderLista() {
  const empty = document.getElementById('empty-state');
  const tabela = document.getElementById('tabela-rnc');
  const body = document.getElementById('tabela-body');

  body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-sub)">Carregando...</td></tr>`;
  tabela.style.display = '';
  empty.style.display = 'none';

  let list = await loadRegistros();
  await populateListaAno(list);

  if (filtroAtivo !== 'todos') list = list.filter(r => r.classificacao === filtroAtivo);

  if (filtroMes !== 'todos') {
    list = list.filter(r => r.data_abertura && r.data_abertura.split('-')[1] === filtroMes);
  }
  if (filtroAno !== 'todos') {
    list = list.filter(r => r.data_abertura && r.data_abertura.split('-')[0] === filtroAno);
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

  if (list.length === 0) {
    empty.style.display = '';
    tabela.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  tabela.style.display = '';
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
        <div class="td-actions">
          <button class="btn-icon" title="Ver" onclick="verRNC(${r.id})">👁</button>
          <button class="btn-icon del" title="Excluir" onclick="excluirDireto(${r.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

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

document.getElementById('lista-mes').addEventListener('change', e => {
  filtroMes = e.target.value;
  renderLista();
});

document.getElementById('lista-ano').addEventListener('change', e => {
  filtroAno = e.target.value;
  renderLista();
});

// ── EXCLUSÃO DIRETA NA TABELA ─────────────
async function excluirDireto(id) {
  const list = await loadRegistros();
  const r = list.find(x => x.id === id);
  if (!r) return;
  openConfirm(
    `Excluir RNC ${r.numero}?`,
    'Esta ação não pode ser desfeita.',
    async () => {
      const ok = await deleteRegistro(id);
      if (ok) {
        renderLista();
        showToast(`RNC ${r.numero} excluída.`);
      }
    }
  );
}

// ── MODAL: VER RNC ────────────────────────
async function verRNC(id) {
  const list = await loadRegistros();
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

  document.getElementById('modal').dataset.currentId = id;
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-close2').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) closeModal(); });

document.getElementById('modal-excluir').addEventListener('click', async () => {
  const id = Number(document.getElementById('modal').dataset.currentId);
  if (!id) return;
  const list = await loadRegistros();
  const r = list.find(x => x.id === id);
  closeModal();
  openConfirm(
    `Excluir RNC ${r ? r.numero : ''}?`,
    'Esta ação não pode ser desfeita.',
    async () => {
      const ok = await deleteRegistro(id);
      if (ok) {
        renderLista();
        showToast(`RNC ${r ? r.numero : ''} excluída.`);
      }
    }
  );
});

document.getElementById('modal-imprimir').addEventListener('click', () => window.print());

// ── CONFIRM DIALOG (genérico) ─────────────
let _confirmCallback = null;
function openConfirm(msg, sub, onConfirm) {
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-sub').textContent = sub;
  _confirmCallback = onConfirm;
  document.getElementById('confirm-overlay').style.display = 'flex';
}
function closeConfirm() {
  document.getElementById('confirm-overlay').style.display = 'none';
  _confirmCallback = null;
}
document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
document.getElementById('confirm-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('confirm-overlay')) closeConfirm();
});
document.getElementById('confirm-ok').addEventListener('click', () => {
  if (_confirmCallback) _confirmCallback();
  closeConfirm();
});

// ── TOAST ─────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */

let dashAnoAtivo = 'todos';
let dashMesAtivo = 'todos';

async function populateDashAno(list) {
  const anos = new Set();
  list.forEach(r => {
    if (r.data_abertura) anos.add(r.data_abertura.split('-')[0]);
  });
  const sel = document.getElementById('dash-ano');
  const anosArr = Array.from(anos).sort((a, b) => b - a);
  sel.innerHTML = `<option value="todos">Todos os anos</option>` +
    anosArr.map(a => `<option value="${a}">${a}</option>`).join('');
  sel.value = dashAnoAtivo;
}

document.getElementById('dash-ano').addEventListener('change', e => {
  dashAnoAtivo = e.target.value;
  renderDashboard();
});

document.getElementById('dash-mes').addEventListener('change', e => {
  dashMesAtivo = e.target.value;
  renderDashboard();
});

async function renderDashboard() {
  let list = await loadRegistros();
  await populateDashAno(list);

  if (dashAnoAtivo !== 'todos') {
    list = list.filter(r => r.data_abertura && r.data_abertura.startsWith(dashAnoAtivo));
  }
  if (dashMesAtivo !== 'todos') {
    list = list.filter(r => r.data_abertura && r.data_abertura.split('-')[1] === dashMesAtivo);
  }

  renderKPIs(list);
  renderChartTipo(list);
  renderChartClassificacao(list);
  renderChartArea(list);
  renderChartMes(list);
}

function renderKPIs(list) {
  const total = list.length;
  const criticas = list.filter(r => r.classificacao === 'Crítica').length;
  const reincidentes = list.filter(r => r.reincidente === 'Sim').length;
  const procedentes = list.filter(r => r.procedente === 'Sim').length;

  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Total de RNCs</div>
      <div class="kpi-value">${total}</div>
      <div class="kpi-sub">registros no período</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Críticas</div>
      <div class="kpi-value red">${criticas}</div>
      <div class="kpi-sub">${total ? Math.round(criticas/total*100) : 0}% do total</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Reincidentes</div>
      <div class="kpi-value amber">${reincidentes}</div>
      <div class="kpi-sub">${total ? Math.round(reincidentes/total*100) : 0}% do total</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Procedentes</div>
      <div class="kpi-value blue">${procedentes}</div>
      <div class="kpi-sub">${total ? Math.round(procedentes/total*100) : 0}% do total</div>
    </div>
  `;
}

// Horizontal bar chart (generic) — for Tipo and Área
function renderBarChart(containerId, counts, colorMap, defaultColor) {
  const container = document.getElementById(containerId);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    container.innerHTML = `<div class="bar-empty">Sem dados para exibir.</div>`;
    return;
  }

  const max = Math.max(...entries.map(e => e[1]));
  container.innerHTML = entries.map(([label, count]) => {
    const pct = Math.max((count / max) * 100, 6);
    const color = (colorMap && colorMap[label]) || defaultColor;
    return `
      <div class="bar-row">
        <div class="bar-label" title="${label}">${label}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%; background:${color}">
            <span>${count}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderChartTipo(list) {
  const counts = {};
  list.forEach(r => {
    const t = r.tipo || 'Não definido';
    counts[t] = (counts[t] || 0) + 1;
  });
  renderBarChart('chart-tipo', counts, TIPO_COLORS, 'var(--c6)');
}

function renderChartArea(list) {
  const counts = {};
  list.forEach(r => {
    (r.areas && r.areas.length ? r.areas : ['Não definido']).forEach(a => {
      counts[a] = (counts[a] || 0) + 1;
    });
  });
  renderBarChart('chart-area', counts, AREA_COLORS, 'var(--c2)');
}

// Donut chart for Classificação
function renderChartClassificacao(list) {
  const counts = { 'Crítica': 0, 'Maior': 0, 'Menor': 0 };
  list.forEach(r => {
    if (r.classificacao && counts.hasOwnProperty(r.classificacao)) counts[r.classificacao]++;
    else if (r.classificacao) counts[r.classificacao] = (counts[r.classificacao] || 0) + 1;
  });

  const colors = { 'Crítica': '#E63946', 'Maior': '#D97706', 'Menor': '#2563EB' };
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const container = document.getElementById('chart-class');

  if (total === 0) {
    container.innerHTML = `<div class="bar-empty">Sem dados para exibir.</div>`;
    return;
  }

  // Build SVG donut
  const r = 70, cx = 90, cy = 90, strokeW = 28;
  const circumference = 2 * Math.PI * r;
  let offsetAcc = 0;
  const segments = entries.map(([label, val]) => {
    const frac = val / total;
    const dash = frac * circumference;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[label] || '#999'}"
      stroke-width="${strokeW}" stroke-dasharray="${dash} ${circumference - dash}"
      stroke-dashoffset="${-offsetAcc}" transform="rotate(-90 ${cx} ${cy})" />`;
    offsetAcc += dash;
    return seg;
  }).join('');

  const legend = entries.map(([label, val]) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${colors[label] || '#999'}"></span>
      ${label}
      <span class="legend-count">${val} (${Math.round(val/total*100)}%)</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="donut-wrap">
      <svg viewBox="0 0 180 180" width="180" height="180">
        ${segments}
        <text x="90" y="84" text-anchor="middle" font-size="26" font-weight="900" fill="#1C2B3A">${total}</text>
        <text x="90" y="104" text-anchor="middle" font-size="11" fill="#6B7B8D">RNCs</text>
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>
  `;
}

// Monthly bar chart (vertical, SVG)
function renderChartMes(list) {
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const counts = new Array(12).fill(0);

  list.forEach(r => {
    if (!r.data_abertura) return;
    const m = parseInt(r.data_abertura.split('-')[1], 10) - 1;
    if (m >= 0 && m < 12) counts[m]++;
  });

  const container = document.getElementById('chart-mes');
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) {
    container.innerHTML = `<div class="bar-empty">Sem dados para exibir.</div>`;
    return;
  }

  const max = Math.max(...counts, 1);
  const W = 760, H = 220, padB = 30, padT = 20, padL = 10, padR = 10;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = chartW / 12 * 0.6;
  const gap = chartW / 12;

  let bars = '';
  counts.forEach((c, i) => {
    const barH = (c / max) * chartH;
    const x = padL + i * gap + (gap - barW) / 2;
    const y = padT + (chartH - barH);
    const mesNum = String(i + 1).padStart(2, '0');
    const isSelected = dashMesAtivo === mesNum;
    const fill = isSelected ? '#C1121F' : '#E63946';
    const opacity = dashMesAtivo !== 'todos' ? (isSelected ? 1 : 0.25) : (c === max ? 1 : 0.75);
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="${fill}" opacity="${opacity}" />`;
    if (c > 0) bars += `<text x="${x + barW/2}" y="${y - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="#1C2B3A">${c}</text>`;
    bars += `<text x="${x + barW/2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${isSelected ? '#C1121F' : '#6B7B8D'}" font-weight="${isSelected ? '700' : '400'}">${meses[i]}</text>`;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#DDE3EA" stroke-width="1.5" />
      ${bars}
    </svg>
  `;
}

/* ══════════════════════════════════════════
   IMPORTAR / EXPORTAR PLANILHA
══════════════════════════════════════════ */

// Mapeamento: chave interna do registro → rótulo de coluna na planilha
const CAMPO_PARA_COLUNA = {
  numero: 'Número RNC',
  tipo: 'Tipo',
  classificacao: 'Classificação',
  areas: 'Áreas de Atuação',
  cliente_fornecedor: 'Cliente/Fornecedor',
  contato: 'Contato',
  data_ocorrencia: 'Data Ocorrência',
  data_abertura: 'Data Abertura',
  reincidente: 'Reincidente',
  procedente: 'Procedente',
  mudanca_sgi: 'Mudança no SGI',
  planilha_riscos: 'Planilha de Riscos',
  descricao_fato: 'Descrição do Fato',
  descricao_data: 'Data Descrição',
  descricao_responsavel: 'Responsável Descrição',
  acao_imediata: 'Ação Imediata',
  acao_imediata_data: 'Data Ação Imediata',
  acao_imediata_responsavel: 'Responsável Ação Imediata',
  analise_causas: 'Análise das Causas',
  analise_causas_data: 'Data Análise Causas',
  analise_causas_responsavel: 'Responsável Análise Causas',
  acao_corretiva: 'Ação Corretiva',
  acao_corretiva_data: 'Data Ação Corretiva',
  acao_corretiva_responsavel: 'Responsável Ação Corretiva',
  implementacao_acao: 'Implementação da Ação',
  implementacao_data: 'Data Implementação',
  implementacao_responsavel: 'Responsável Implementação',
  verificacao_eficacia: 'Verificação da Eficácia',
  verificacao_data: 'Data Verificação',
  verificacao_responsavel: 'Responsável Verificação',
};

const CAMPOS_DATA = new Set([
  'data_ocorrencia', 'data_abertura', 'descricao_data', 'acao_imediata_data',
  'analise_causas_data', 'acao_corretiva_data', 'implementacao_data', 'verificacao_data'
]);

const CAMPOS_OBRIGATORIOS = ['tipo', 'classificacao', 'data_abertura'];

// ── EXPORTAR ──────────────────────────────
function excelDateOrString(value) {
  if (!value) return '';
  // já está em YYYY-MM-DD
  return value;
}

document.getElementById('btn-exportar').addEventListener('click', async () => {
  const btn = document.getElementById('btn-exportar');
  btn.disabled = true;
  btn.textContent = 'Exportando...';

  try {
    const list = await loadRegistros();
    if (list.length === 0) {
      showToast('Não há registros para exportar.');
      return;
    }

    const colunas = Object.values(CAMPO_PARA_COLUNA);
    const linhas = list
      .sort((a, b) => (a.numero || '').localeCompare(b.numero || ''))
      .map(r => {
        const linha = {};
        Object.entries(CAMPO_PARA_COLUNA).forEach(([campo, coluna]) => {
          let val = r[campo];
          if (campo === 'areas') val = (val || []).join(', ');
          else if (CAMPOS_DATA.has(campo)) val = excelDateOrString(val);
          linha[coluna] = val || '';
        });
        return linha;
      });

    const ws = XLSX.utils.json_to_sheet(linhas);
    ws['!cols'] = colunas.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RNC');

    const dataStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `RNC_export_${dataStr}.xlsx`);
    showToast(`${list.length} registro(s) exportado(s) com sucesso!`);
  } catch (err) {
    console.error('Erro ao exportar:', err);
    showToast('Erro ao gerar a planilha.');
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ Exportar';
  }
});

// ── IMPORTAR ──────────────────────────────
let _importBuffer = []; // registros validados, prontos para enviar

document.getElementById('btn-importar').addEventListener('click', () => {
  document.getElementById('input-importar').click();
});

document.getElementById('input-importar').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await processarArquivoImportacao(file);
  e.target.value = ''; // permite selecionar o mesmo arquivo de novo depois
});

// Converte data do Excel (serial number ou string) para YYYY-MM-DD
function parseDataPlanilha(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  // DD/MM/AAAA
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // AAAA-MM-DD (já correto)
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return null;
}

async function processarArquivoImportacao(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array', cellDates: false });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        showToast('A planilha está vazia.');
        return;
      }

      const COLUNA_PARA_CAMPO = {};
      Object.entries(CAMPO_PARA_COLUNA).forEach(([campo, coluna]) => {
        COLUNA_PARA_CAMPO[coluna.toLowerCase().trim()] = campo;
      });

      const registros = [];
      const erros = [];

      rows.forEach((row, idx) => {
        const linhaNum = idx + 2; // +1 cabeçalho, +1 base 1
        const registro = {};
        Object.keys(row).forEach(colName => {
          const campo = COLUNA_PARA_CAMPO[colName.toLowerCase().trim()];
          if (!campo) return;
          let val = row[colName];
          if (campo === 'areas') {
            registro[campo] = String(val).split(',').map(s => s.trim()).filter(Boolean);
          } else if (CAMPOS_DATA.has(campo)) {
            registro[campo] = parseDataPlanilha(val);
          } else {
            registro[campo] = String(val).trim();
          }
        });

        const faltando = CAMPOS_OBRIGATORIOS.filter(c => !registro[c]);
        if (faltando.length > 0) {
          erros.push(`Linha ${linhaNum}: faltando ${faltando.map(c => CAMPO_PARA_COLUNA[c]).join(', ')}`);
          return;
        }

        registros.push(registro);
      });

      _importBuffer = registros;
      mostrarPreviewImportacao(registros, erros, rows.length);
    } catch (err) {
      console.error('Erro ao ler planilha:', err);
      showToast('Não foi possível ler o arquivo. Verifique o formato.');
    }
  };
  reader.readAsArrayBuffer(file);
}

function mostrarPreviewImportacao(registros, erros, totalLinhas) {
  const modal = document.getElementById('import-modal');
  const summary = document.getElementById('import-summary');
  const errorsBox = document.getElementById('import-errors');
  const table = document.getElementById('import-preview-table');

  summary.innerHTML = `<strong>${registros.length}</strong> de ${totalLinhas} linha(s) prontas para importar.`;

  if (erros.length > 0) {
    errorsBox.innerHTML = `<strong>${erros.length} linha(s) ignorada(s) por dados incompletos:</strong>
      <ul>${erros.slice(0, 10).map(e => `<li>${e}</li>`).join('')}</ul>
      ${erros.length > 10 ? `<div>... e mais ${erros.length - 10}</div>` : ''}`;
  } else {
    errorsBox.innerHTML = '';
  }

  if (registros.length === 0) {
    table.innerHTML = '';
    document.getElementById('import-confirm').disabled = true;
  } else {
    document.getElementById('import-confirm').disabled = false;
    const previewCols = ['numero', 'tipo', 'classificacao', 'data_abertura', 'cliente_fornecedor'];
    const amostra = registros.slice(0, 8);
    table.innerHTML = `
      <thead><tr>${previewCols.map(c => `<th>${CAMPO_PARA_COLUNA[c] || c}</th>`).join('')}</tr></thead>
      <tbody>
        ${amostra.map(r => `<tr>${previewCols.map(c => `<td>${r[c] || '—'}</td>`).join('')}</tr>`).join('')}
      </tbody>
    `;
  }

  modal.style.display = 'flex';
}

function closeImportModal() {
  document.getElementById('import-modal').style.display = 'none';
  _importBuffer = [];
}
document.getElementById('import-close').addEventListener('click', closeImportModal);
document.getElementById('import-cancel').addEventListener('click', closeImportModal);
document.getElementById('import-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('import-modal')) closeImportModal();
});

document.getElementById('import-confirm').addEventListener('click', async () => {
  const btn = document.getElementById('import-confirm');
  const registros = _importBuffer;
  if (registros.length === 0) return;

  btn.disabled = true;
  btn.textContent = `Importando 0/${registros.length}...`;

  let ano = new Date().getFullYear();
  let sucesso = 0, falha = 0;

  for (let i = 0; i < registros.length; i++) {
    const r = registros[i];
    if (!r.numero) {
      const anoRef = r.data_abertura ? r.data_abertura.split('-')[0] : String(ano);
      const seq = (await countByAno(anoRef)) + 1;
      r.numero = `${anoRef}-${String(seq).padStart(3, '0')}`;
    }
    const saved = await insertRegistro(r);
    if (saved) sucesso++; else falha++;
    btn.textContent = `Importando ${i + 1}/${registros.length}...`;
  }

  btn.disabled = false;
  btn.textContent = 'Confirmar Importação';
  closeImportModal();
  renderLista();
  updateNumeroDisplay();

  if (falha === 0) {
    showToast(`${sucesso} registro(s) importado(s) com sucesso!`);
  } else {
    showToast(`${sucesso} importado(s), ${falha} falharam. Veja o console para detalhes.`);
  }
});


window.verRNC = verRNC;
window.excluirDireto = excluirDireto;
