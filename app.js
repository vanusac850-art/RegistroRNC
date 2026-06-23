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
   (segue o layout oficial do formulário RNC,
   uma aba por RNC, células fixas + marcação "X")
══════════════════════════════════════════ */

// Mapeamento: campo do registro → célula de entrada na planilha
const CELL_MAP = {
  numero: 'J7', data_ocorrencia: 'J9', data_abertura: 'J11',
  reincidente: 'L13', procedente: 'O13',
  cliente_fornecedor: 'D11', contato: 'D12',
  mudanca_sgi: 'E15', planilha_riscos: 'I15',
  descricao_fato: 'B18', descricao_data: 'C24', descricao_responsavel: 'I24',
  acao_imediata: 'B26', acao_imediata_data: 'C30', acao_imediata_responsavel: 'I30',
  analise_causas: 'B32', analise_causas_data: 'C36', analise_causas_responsavel: 'I36',
  acao_corretiva: 'B38', acao_corretiva_data: 'C42', acao_corretiva_responsavel: 'I42',
  implementacao_acao: 'B44', implementacao_data: 'C50', implementacao_responsavel: 'I50',
  verificacao_eficacia: 'B52', verificacao_data: 'C58', verificacao_responsavel: 'I58',
};

const CAMPOS_DATA = new Set([
  'data_ocorrencia', 'data_abertura', 'descricao_data', 'acao_imediata_data',
  'analise_causas_data', 'acao_corretiva_data', 'implementacao_data', 'verificacao_data'
]);

// Células de marcação "X" → valor correspondente
const TIPO_CELLS = { C7: 'Rotina', C8: 'Reclamação de Cliente', C9: 'Auditoria Interna', C10: 'Auditoria Externa' };
const CLASSIF_CELLS = { E7: 'Crítica', E8: 'Maior', E9: 'Menor' };
const AREA_CELLS = {
  G7: 'Direção/SGI', G8: 'Comercial', G9: 'Obras', G10: 'Recursos Humanos',
  G11: 'Suprimentos', G12: 'Almoxarifado', G13: 'Gestão de Ativos',
  I7: 'Financeiro', I8: 'ADM. Vassouras', I9: 'SST', I10: 'Mobilização',
  I11: 'DP', I12: 'Logística',
};

const ROTULOS_CAMPO = {
  numero: 'Número RNC', tipo: 'Tipo', classificacao: 'Classificação', areas: 'Área de Atuação',
  data_abertura: 'Data da Abertura', cliente_fornecedor: 'Cliente/Fornecedor',
};
const CAMPOS_OBRIGATORIOS = ['tipo', 'classificacao', 'data_abertura'];

// ── HELPERS DE DATA ───────────────────────
function isoParaBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function parseDataPlanilha(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return null;
}

// ── ESTILO DA PLANILHA (igual ao modelo oficial) ──
const XLSX_STYLE = {
  headerFill: 'FF997300',
  headerFont: { name: 'Calibri', bold: true, sz: 12, color: { rgb: 'FFFFFFFF' } },
  titleFont: { name: 'Calibri', bold: true, sz: 18, color: { rgb: 'FF000000' } },
  subtitleFont: { name: 'Calibri', sz: 9, color: { rgb: 'FF000000' } },
  labelFont: { name: 'Calibri', bold: true, sz: 10, color: { rgb: 'FF000000' } },
  markFont: { name: 'Calibri', bold: true, sz: 12, color: { rgb: 'FFC1121F' } },
  inputFont: { name: 'Calibri', sz: 11, color: { rgb: 'FF000000' } },
  thinBorder: { style: 'thin', color: { rgb: 'FFBFBFBF' } },
};

function borderAll() {
  return {
    top: XLSX_STYLE.thinBorder, bottom: XLSX_STYLE.thinBorder,
    left: XLSX_STYLE.thinBorder, right: XLSX_STYLE.thinBorder,
  };
}

// Constrói uma planilha (worksheet) preenchida com os dados de um registro,
// seguindo exatamente o layout do formulário oficial.
function construirAbaRNC(registro) {
  const ws = {};
  const merges = [];
  const setCell = (coord, value, opts = {}) => {
    ws[coord] = { v: value != null ? value : '', t: 's', s: opts };
  };
  const merge = (range) => {
    const [from, to] = range.split(':');
    const r1 = XLSX.utils.decode_cell(from);
    const r2 = XLSX.utils.decode_cell(to);
    merges.push({ s: r1, e: r2 });
  };

  const centerStyle = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
  const leftMidStyle = { alignment: { horizontal: 'left', vertical: 'center', wrapText: true } };
  const leftNoWrapStyle = { alignment: { horizontal: 'left', vertical: 'center', wrapText: false } };
  const leftTopStyle = { alignment: { horizontal: 'left', vertical: 'top', wrapText: true } };

  // Cabeçalho
  setCell('B2', 'RELATÓRIO DE NÃO CONFORMIDADE', { font: XLSX_STYLE.titleFont, alignment: centerStyle.alignment });
  merge('B2:Q2');
  setCell('B3', 'FR-SGI-15-00   |   Elaborado em: 14/08/2024   |   Rev.01', { font: XLSX_STYLE.subtitleFont, alignment: centerStyle.alignment });
  merge('B3:Q4');

  setCell('B5', 'DADOS PARA CONTROLE DO SISTEMA DE GESTÃO', { font: XLSX_STYLE.headerFont, fill: { fgColor: { rgb: XLSX_STYLE.headerFill } }, alignment: centerStyle.alignment });
  merge('B5:Q5');

  setCell('B6', 'TIPO', { font: XLSX_STYLE.labelFont, alignment: centerStyle.alignment });
  merge('B6:C6');
  setCell('D6', 'CLASSIFICAÇÃO', { font: XLSX_STYLE.labelFont, alignment: centerStyle.alignment });
  merge('D6:E6');
  setCell('F6', 'ÁREA DE ATUAÇÃO', { font: XLSX_STYLE.labelFont, alignment: centerStyle.alignment });
  merge('F6:I6');
  setCell('J6', 'NÚMERO RNC', { font: XLSX_STYLE.labelFont, alignment: centerStyle.alignment });
  merge('J6:Q6');

  const TIPO_OPCOES = ['Rotina', 'Reclamação de Cliente', 'Auditoria Interna', 'Auditoria Externa'];
  const CLASSIF_OPCOES = ['Crítica', 'Maior', 'Menor'];
  const AREA_COL_F = ['Direção/SGI', 'Comercial', 'Obras', 'Recursos Humanos', 'Suprimentos', 'Almoxarifado'];
  const AREA_COL_H = ['Financeiro', 'ADM. Vassouras', 'SST', 'Mobilização', 'DP', 'Logística'];

  TIPO_OPCOES.forEach((opt, i) => {
    const r = 7 + i;
    setCell(`B${r}`, opt, { font: XLSX_STYLE.inputFont, alignment: leftNoWrapStyle.alignment });
    const marcado = registro.tipo === opt ? 'X' : '';
    setCell(`C${r}`, marcado, { font: XLSX_STYLE.markFont, alignment: centerStyle.alignment, border: borderAll() });
  });

  CLASSIF_OPCOES.forEach((opt, i) => {
    const r = 7 + i;
    setCell(`D${r}`, opt, { font: XLSX_STYLE.inputFont, alignment: leftNoWrapStyle.alignment });
    const marcado = registro.classificacao === opt ? 'X' : '';
    setCell(`E${r}`, marcado, { font: XLSX_STYLE.markFont, alignment: centerStyle.alignment, border: borderAll() });
  });

  const areasSet = new Set(registro.areas || []);
  AREA_COL_F.forEach((opt, i) => {
    const r = 7 + i;
    setCell(`F${r}`, opt, { font: XLSX_STYLE.inputFont, alignment: leftNoWrapStyle.alignment });
    setCell(`G${r}`, areasSet.has(opt) ? 'X' : '', { font: XLSX_STYLE.markFont, alignment: centerStyle.alignment, border: borderAll() });
  });
  AREA_COL_H.forEach((opt, i) => {
    const r = 7 + i;
    setCell(`H${r}`, opt, { font: XLSX_STYLE.inputFont, alignment: leftNoWrapStyle.alignment });
    setCell(`I${r}`, areasSet.has(opt) ? 'X' : '', { font: XLSX_STYLE.markFont, alignment: centerStyle.alignment, border: borderAll() });
  });
  setCell('F13', 'Gestão de Ativos', { font: XLSX_STYLE.inputFont, alignment: leftNoWrapStyle.alignment });
  setCell('G13', areasSet.has('Gestão de Ativos') ? 'X' : '', { font: XLSX_STYLE.markFont, alignment: centerStyle.alignment, border: borderAll() });

  // Número / datas / reincidência / procedência
  setCell('J7', registro.numero || '', { font: XLSX_STYLE.inputFont, alignment: centerStyle.alignment, border: borderAll() });
  merge('J7:Q7');

  setCell('J8', 'Data da Ocorrência:', { font: XLSX_STYLE.labelFont });
  merge('J8:Q8');
  setCell('J9', isoParaBR(registro.data_ocorrencia), { font: XLSX_STYLE.inputFont, alignment: centerStyle.alignment, border: borderAll() });
  merge('J9:Q9');

  setCell('J10', 'Data da Abertura:', { font: XLSX_STYLE.labelFont });
  merge('J10:Q10');
  setCell('J11', isoParaBR(registro.data_abertura), { font: XLSX_STYLE.inputFont, alignment: centerStyle.alignment, border: borderAll() });
  merge('J11:Q11');

  setCell('B11', 'Cliente/Fornecedor:', { font: XLSX_STYLE.labelFont, alignment: leftMidStyle.alignment });
  merge('B11:C11');
  setCell('D11', registro.cliente_fornecedor || '', { font: XLSX_STYLE.inputFont, alignment: leftMidStyle.alignment, border: borderAll() });
  merge('D11:E11');

  setCell('B12', 'Contato:', { font: XLSX_STYLE.labelFont, alignment: leftMidStyle.alignment });
  merge('B12:C12');
  setCell('D12', registro.contato || '', { font: XLSX_STYLE.inputFont, alignment: leftMidStyle.alignment, border: borderAll() });
  merge('D12:E12');

  setCell('L12', 'RNC Reincidente?', { font: XLSX_STYLE.labelFont, alignment: centerStyle.alignment });
  merge('L12:M12');
  setCell('L13', registro.reincidente || '', { font: XLSX_STYLE.inputFont, alignment: centerStyle.alignment, border: borderAll() });
  merge('L13:M13');

  setCell('O12', 'É procedente?', { font: XLSX_STYLE.labelFont, alignment: centerStyle.alignment });
  merge('O12:P12');
  setCell('O13', registro.procedente || '', { font: XLSX_STYLE.inputFont, alignment: centerStyle.alignment, border: borderAll() });
  merge('O13:P13');

  // Gestão de mudanças / riscos
  setCell('B14', 'Gerenciamento de Mudanças', { font: XLSX_STYLE.labelFont, alignment: leftMidStyle.alignment });
  merge('B14:E14');
  setCell('F14', 'Gestão de Riscos e Oportunidades', { font: XLSX_STYLE.labelFont, alignment: leftMidStyle.alignment });
  merge('F14:I14');

  setCell('B15', 'Necessário fazer alguma mudança no SGI?', { font: XLSX_STYLE.inputFont, alignment: leftTopStyle.alignment });
  merge('B15:D16');
  setCell('E15', registro.mudanca_sgi || '', { font: XLSX_STYLE.inputFont, alignment: centerStyle.alignment, border: borderAll() });
  merge('E15:E16');

  setCell('F15', 'Há necessidade de incluir alguma atividade na planilha de riscos?', { font: XLSX_STYLE.inputFont, alignment: leftTopStyle.alignment });
  merge('F15:H16');
  setCell('I15', registro.planilha_riscos || '', { font: XLSX_STYLE.inputFont, alignment: centerStyle.alignment, border: borderAll() });
  merge('I15:I16');

  // Seções de texto longo
  const secoes = [
    [17, 'DESCRIÇÃO DO FATO OCORRIDO', 18, 23, 24, 'descricao_fato', 'descricao_data', 'descricao_responsavel'],
    [25, 'AÇÃO IMEDIATA', 26, 29, 30, 'acao_imediata', 'acao_imediata_data', 'acao_imediata_responsavel'],
    [31, 'ANÁLISE DAS CAUSAS', 32, 35, 36, 'analise_causas', 'analise_causas_data', 'analise_causas_responsavel'],
    [37, 'AÇÃO CORRETIVA', 38, 41, 42, 'acao_corretiva', 'acao_corretiva_data', 'acao_corretiva_responsavel'],
    [43, 'IMPLEMENTAÇÃO DA AÇÃO CORRETIVA', 44, 49, 50, 'implementacao_acao', 'implementacao_data', 'implementacao_responsavel'],
    [51, 'VERIFICAÇÃO DA EFICÁCIA DA AÇÃO CORRETIVA', 52, 57, 58, 'verificacao_eficacia', 'verificacao_data', 'verificacao_responsavel'],
  ];

  secoes.forEach(([headerRow, titulo, textStart, textEnd, metaRow, campoTexto, campoData, campoResp]) => {
    setCell(`B${headerRow}`, titulo, { font: XLSX_STYLE.headerFont, fill: { fgColor: { rgb: XLSX_STYLE.headerFill } }, alignment: centerStyle.alignment });
    merge(`B${headerRow}:Q${headerRow}`);

    setCell(`B${textStart}`, registro[campoTexto] || '', { font: XLSX_STYLE.inputFont, alignment: leftTopStyle.alignment, border: borderAll() });
    merge(`B${textStart}:Q${textEnd}`);

    setCell(`B${metaRow}`, 'Data:', { font: XLSX_STYLE.labelFont, alignment: leftMidStyle.alignment });
    setCell(`C${metaRow}`, isoParaBR(registro[campoData]), { font: XLSX_STYLE.inputFont, alignment: centerStyle.alignment, border: borderAll() });
    merge(`C${metaRow}:F${metaRow}`);
    setCell(`G${metaRow}`, 'Responsável:', { font: XLSX_STYLE.labelFont, alignment: leftNoWrapStyle.alignment });
    setCell(`I${metaRow}`, registro[campoResp] || '', { font: XLSX_STYLE.inputFont, alignment: leftMidStyle.alignment, border: borderAll() });
    merge(`I${metaRow}:Q${metaRow}`);
  });

  ws['!ref'] = 'A1:Q58';
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 3 }, { wch: 19 }, { wch: 7 }, { wch: 13 }, { wch: 7 }, { wch: 16 }, { wch: 11 },
    { wch: 14 }, { wch: 7 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 11 },
    { wch: 11 }, { wch: 11 }, { wch: 11 },
  ];
  ws['!rows'] = [
    {}, { hpt: 6 }, { hpt: 28 }, { hpt: 36 }, { hpt: 14 }, { hpt: 20 }, { hpt: 16 },
    { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 20 }, { hpt: 18 }, { hpt: 18 },
    { hpt: 16 }, { hpt: 18 }, { hpt: 30 }, { hpt: 18 },
  ];

  return ws;
}

// Nome de aba seguro (Excel não aceite: \ / ? * [ ] e máx. 31 caracteres)
function nomeAbaSeguro(numero, indice) {
  let nome = (numero || `RNC_${indice + 1}`).replace(/[\\/?*\[\]:]/g, '-');
  return nome.slice(0, 31);
}

// ── EXPORTAR ──────────────────────────────
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

    const ordenados = list.slice().sort((a, b) => (a.numero || '').localeCompare(b.numero || ''));
    const wb = { SheetNames: [], Sheets: {} };
    const nomesUsados = new Set();

    ordenados.forEach((registro, idx) => {
      let nome = nomeAbaSeguro(registro.numero, idx);
      let sufixo = 1;
      while (nomesUsados.has(nome)) {
        nome = `${nomeAbaSeguro(registro.numero, idx).slice(0, 28)}_${sufixo++}`;
      }
      nomesUsados.add(nome);
      wb.SheetNames.push(nome);
      wb.Sheets[nome] = construirAbaRNC(registro);
    });

    const dataStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `RNC_export_${dataStr}.xlsx`);
    showToast(`${list.length} RNC(s) exportada(s), uma aba por registro!`);
  } catch (err) {
    console.error('Erro ao exportar:', err);
    showToast('Erro ao gerar a planilha.');
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ Exportar';
  }
});

// ── IMPORTAR ──────────────────────────────
// Lê uma aba no layout oficial e devolve um objeto de registro (sem salvar)
function lerAbaRNC(sheet) {
  const getVal = (coord) => {
    const cell = sheet[coord];
    return cell ? cell.v : '';
  };

  const registro = {};
  Object.entries(CELL_MAP).forEach(([campo, coord]) => {
    let val = getVal(coord);
    if (CAMPOS_DATA.has(campo)) {
      val = parseDataPlanilha(val);
    } else if (typeof val === 'string') {
      val = val.trim();
    }
    registro[campo] = val || (CAMPOS_DATA.has(campo) ? null : '');
  });

  registro.tipo = Object.entries(TIPO_CELLS).find(([coord]) => String(getVal(coord) || '').trim().toUpperCase() === 'X')?.[1] || '';
  registro.classificacao = Object.entries(CLASSIF_CELLS).find(([coord]) => String(getVal(coord) || '').trim().toUpperCase() === 'X')?.[1] || '';
  registro.areas = Object.entries(AREA_CELLS).filter(([coord]) => String(getVal(coord) || '').trim().toUpperCase() === 'X').map(([, label]) => label);

  return registro;
}

document.getElementById('btn-importar').addEventListener('click', () => {
  document.getElementById('input-importar').click();
});

document.getElementById('input-importar').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await processarArquivoImportacao(file);
  e.target.value = '';
});

let _importBuffer = null; // registro único pronto para preencher o formulário
let _importAbas = [];     // { nome, registro } — quando há múltiplas abas

async function processarArquivoImportacao(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array', cellDates: false });

      if (wb.SheetNames.length === 0) {
        showToast('O arquivo não contém nenhuma aba.');
        return;
      }

      _importAbas = wb.SheetNames.map(nome => ({
        nome,
        registro: lerAbaRNC(wb.Sheets[nome]),
      }));

      if (_importAbas.length === 1) {
        mostrarPreviewImportacao(_importAbas[0]);
      } else {
        mostrarSeletorDeAbas(_importAbas);
      }
    } catch (err) {
      console.error('Erro ao ler planilha:', err);
      showToast('Não foi possível ler o arquivo. Verifique se segue o modelo de RNC.');
    }
  };
  reader.readAsArrayBuffer(file);
}

function mostrarSeletorDeAbas(abas) {
  const modal = document.getElementById('import-modal');
  const summary = document.getElementById('import-summary');
  const errorsBox = document.getElementById('import-errors');
  const table = document.getElementById('import-preview-table');

  summary.innerHTML = `O arquivo contém <strong>${abas.length} abas</strong>. Escolha qual RNC importar para o formulário:`;
  errorsBox.innerHTML = '';

  table.innerHTML = `
    <thead><tr><th>Aba</th><th>Número</th><th>Tipo</th><th>Classificação</th><th>Data Abertura</th><th></th></tr></thead>
    <tbody>
      ${abas.map((a, i) => `
        <tr>
          <td>${a.nome}</td>
          <td>${a.registro.numero || '—'}</td>
          <td>${a.registro.tipo || '—'}</td>
          <td>${a.registro.classificacao || '—'}</td>
          <td>${isoParaBR(a.registro.data_abertura) || '—'}</td>
          <td><button class="btn-table" onclick="selecionarAbaImportacao(${i})">Importar esta</button></td>
        </tr>
      `).join('')}
    </tbody>
  `;

  document.getElementById('import-confirm').style.display = 'none';
  modal.style.display = 'flex';
}

function selecionarAbaImportacao(indice) {
  document.getElementById('import-confirm').style.display = '';
  mostrarPreviewImportacao(_importAbas[indice]);
}
window.selecionarAbaImportacao = selecionarAbaImportacao;

function mostrarPreviewImportacao(aba) {
  const { registro } = aba;
  const modal = document.getElementById('import-modal');
  const summary = document.getElementById('import-summary');
  const errorsBox = document.getElementById('import-errors');
  const table = document.getElementById('import-preview-table');

  const faltando = CAMPOS_OBRIGATORIOS.filter(c => !registro[c]);

  summary.innerHTML = `Pré-visualização da RNC <strong>${registro.numero || '(sem número)'}</strong>. Os dados serão carregados no formulário "Nova RNC" — nada será salvo automaticamente.`;

  if (faltando.length > 0) {
    errorsBox.innerHTML = `<strong>Atenção:</strong> campos obrigatórios não identificados na planilha: ${faltando.map(c => ROTULOS_CAMPO[c]).join(', ')}. Você poderá completá-los manualmente após carregar.`;
  } else {
    errorsBox.innerHTML = '';
  }

  const linhas = [
    ['Número RNC', registro.numero || '—'],
    ['Tipo', registro.tipo || '—'],
    ['Classificação', registro.classificacao || '—'],
    ['Área de Atuação', (registro.areas || []).join(', ') || '—'],
    ['Cliente/Fornecedor', registro.cliente_fornecedor || '—'],
    ['Data da Abertura', isoParaBR(registro.data_abertura) || '—'],
    ['Data da Ocorrência', isoParaBR(registro.data_ocorrencia) || '—'],
    ['Descrição do Fato', (registro.descricao_fato || '—').slice(0, 80) + ((registro.descricao_fato || '').length > 80 ? '…' : '')],
  ];

  table.innerHTML = `
    <tbody>
      ${linhas.map(([campo, valor]) => `<tr><td><strong>${campo}</strong></td><td>${valor}</td></tr>`).join('')}
    </tbody>
  `;

  document.getElementById('import-confirm').disabled = false;
  document.getElementById('import-confirm').style.display = '';
  _importBuffer = registro;
  modal.style.display = 'flex';
}

function closeImportModal() {
  document.getElementById('import-modal').style.display = 'none';
  _importBuffer = null;
  _importAbas = [];
}
document.getElementById('import-close').addEventListener('click', closeImportModal);
document.getElementById('import-cancel').addEventListener('click', closeImportModal);
document.getElementById('import-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('import-modal')) closeImportModal();
});

// Preenche o formulário "Nova RNC" com os dados importados — SEM salvar
document.getElementById('import-confirm').addEventListener('click', () => {
  const registro = _importBuffer;
  if (!registro) return;

  const form = document.getElementById('form-rnc');
  form.reset();

  const setRadio = (name, value) => {
    const el = form.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  };
  const setText = (name, value) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el) el.value = value || '';
  };

  if (registro.tipo) setRadio('tipo', registro.tipo);
  if (registro.classificacao) setRadio('classificacao', registro.classificacao);
  (registro.areas || []).forEach(area => {
    const el = form.querySelector(`input[name="area"][value="${area}"]`);
    if (el) el.checked = true;
  });

  setText('cliente_fornecedor', registro.cliente_fornecedor);
  setText('contato', registro.contato);
  setText('data_ocorrencia', registro.data_ocorrencia);
  setText('data_abertura', registro.data_abertura);
  setText('reincidente', registro.reincidente);
  setText('procedente', registro.procedente);
  setText('mudanca_sgi', registro.mudanca_sgi);
  setText('planilha_riscos', registro.planilha_riscos);

  setText('descricao_fato', registro.descricao_fato);
  setText('descricao_data', registro.descricao_data);
  setText('descricao_responsavel', registro.descricao_responsavel);

  setText('acao_imediata', registro.acao_imediata);
  setText('acao_imediata_data', registro.acao_imediata_data);
  setText('acao_imediata_responsavel', registro.acao_imediata_responsavel);

  setText('analise_causas', registro.analise_causas);
  setText('analise_causas_data', registro.analise_causas_data);
  setText('analise_causas_responsavel', registro.analise_causas_responsavel);

  setText('acao_corretiva', registro.acao_corretiva);
  setText('acao_corretiva_data', registro.acao_corretiva_data);
  setText('acao_corretiva_responsavel', registro.acao_corretiva_responsavel);

  setText('implementacao_acao', registro.implementacao_acao);
  setText('implementacao_data', registro.implementacao_data);
  setText('implementacao_responsavel', registro.implementacao_responsavel);

  setText('verificacao_eficacia', registro.verificacao_eficacia);
  setText('verificacao_data', registro.verificacao_data);
  setText('verificacao_responsavel', registro.verificacao_responsavel);

  closeImportModal();
  switchTab('nova');
  showToast('Dados carregados no formulário. Revise e clique em "Salvar RNC" para confirmar.');
});

window.verRNC = verRNC;
window.excluirDireto = excluirDireto;
