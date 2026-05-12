/* ============================================================
   Finio — app.js
   Complete financial OS logic
   ============================================================ */

// ── STATE ──
const STATE = {
  transactions: [],
  loans: [],
  recurring: [],
  txnType: 'expense',
};

const CATEGORY_ICONS = {
  Food: '🍔', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬',
  Utilities: '💡', Health: '💊', Subscriptions: '📱', EMI: '🏦',
  Rent: '🏠', Investment: '📈', Salary: '💼', Freelance: '💻', Other: '📌'
};

const CATEGORY_COLORS = [
  '#6ee7b7','#60a5fa','#f87171','#fbbf24','#a78bfa',
  '#34d399','#fb923c','#38bdf8','#e879f9','#4ade80'
];

// ── STORAGE ──
function save() {
  localStorage.setItem('finio_transactions', JSON.stringify(STATE.transactions));
  localStorage.setItem('finio_loans', JSON.stringify(STATE.loans));
  localStorage.setItem('finio_recurring', JSON.stringify(STATE.recurring));
}

function load() {
  STATE.transactions = JSON.parse(localStorage.getItem('finio_transactions') || '[]');
  STATE.loans = JSON.parse(localStorage.getItem('finio_loans') || '[]');
  STATE.recurring = JSON.parse(localStorage.getItem('finio_recurring') || '[]');
}

// ── NAVIGATION ──
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo(0, 0);
  renderPage(page);
}

function renderPage(page) {
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'transactions': renderTransactionPage(); break;
    case 'analytics': renderAnalytics(); break;
    case 'loans': renderLoans(); break;
    case 'recurring': renderRecurring(); break;
    case 'insights': renderInsights(); break;
    case 'ledger': renderLedger(); break;
  }
}

// ── MODALS ──
function openModal(id) {
  document.querySelectorAll('.modal-body').forEach(m => m.style.display = 'none');
  document.getElementById('modal-' + id).style.display = 'block';
  document.getElementById('modalOverlay').classList.add('open');
  if (id === 'addTransaction') {
    document.getElementById('txnDate').value = new Date().toISOString().split('T')[0];
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ── THEME ──
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('finio_theme', next);
  setTimeout(() => renderDashboardCharts(), 100);
}

// ── TRANSACTION TYPE ──
function setTxnType(type) {
  STATE.txnType = type;
  document.getElementById('typeExpense').classList.toggle('active', type === 'expense');
  document.getElementById('typeIncome').classList.toggle('active', type === 'income');
  const catSelect = document.getElementById('txnCategory');
  if (type === 'income') {
    catSelect.value = catSelect.options[10] ? 'Salary' : catSelect.options[0].value;
  } else {
    catSelect.value = 'Food';
  }
}

// ── SAVE TRANSACTION ──
function saveTransaction() {
  const amount = parseFloat(document.getElementById('txnAmount').value);
  const desc = document.getElementById('txnDesc').value.trim();
  const cat = document.getElementById('txnCategory').value;
  const date = document.getElementById('txnDate').value;
  const mode = document.getElementById('txnMode').value;
  const notes = document.getElementById('txnNotes').value.trim();
  const recurring = document.getElementById('txnRecurring').checked;

  if (!amount || amount <= 0) { showToast('Please enter a valid amount', 'error'); return; }
  if (!desc) { showToast('Please add a description', 'error'); return; }
  if (!date) { showToast('Please select a date', 'error'); return; }

  const txn = {
    id: Date.now(),
    type: STATE.txnType,
    amount, desc, category: cat, date, mode, notes, recurring
  };

  STATE.transactions.unshift(txn);
  save();
  closeModal();
  showToast('Transaction saved ✓');
  renderDashboard();
  document.getElementById('txnAmount').value = '';
  document.getElementById('txnDesc').value = '';
  document.getElementById('txnNotes').value = '';
  document.getElementById('txnRecurring').checked = false;
}

// ── SAVE LOAN ──
function saveLoan() {
  const name = document.getElementById('loanName').value.trim();
  const principal = parseFloat(document.getElementById('loanPrincipal').value);
  const balance = parseFloat(document.getElementById('loanBalance').value);
  const emi = parseFloat(document.getElementById('loanEMI').value);
  const rate = parseFloat(document.getElementById('loanRate').value);
  const dueDay = parseInt(document.getElementById('loanDueDay').value) || 1;
  const type = document.getElementById('loanType').value;

  if (!name || !principal || !balance || !emi) { showToast('Please fill all required fields', 'error'); return; }

  STATE.loans.push({ id: Date.now(), name, principal, balance, emi, rate, dueDay, type });
  save();
  closeModal();
  showToast('Loan added ✓');
  renderLoans();
  document.getElementById('loanName').value = '';
}

// ── SAVE RECURRING ──
function saveRecurring() {
  const name = document.getElementById('recName').value.trim();
  const amount = parseFloat(document.getElementById('recAmount').value);
  const freq = document.getElementById('recFrequency').value;
  const cat = document.getElementById('recCategory').value;
  const dueDay = parseInt(document.getElementById('recDueDay').value) || 1;

  if (!name || !amount) { showToast('Please fill all required fields', 'error'); return; }

  STATE.recurring.push({ id: Date.now(), name, amount, frequency: freq, category: cat, dueDay });
  save();
  closeModal();
  showToast('Recurring payment added ✓');
  renderRecurring();
  document.getElementById('recName').value = '';
  document.getElementById('recAmount').value = '';
}

// ── DELETE ──
function deleteTxn(id) {
  STATE.transactions = STATE.transactions.filter(t => t.id !== id);
  save();
  renderTransactionPage();
  renderDashboard();
  showToast('Transaction deleted');
}

function deleteLoan(id) {
  STATE.loans = STATE.loans.filter(l => l.id !== id);
  save();
  renderLoans();
  showToast('Loan removed');
}

function deleteRecurring(id) {
  STATE.recurring = STATE.recurring.filter(r => r.id !== id);
  save();
  renderRecurring();
  showToast('Recurring payment removed');
}

// ── HELPERS ──
function fmt(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtFull(n) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getMonthLabel(key) {
  const [y, m] = key.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m)-1]} ${y}`;
}

function currentMonth() {
  return getMonthKey(new Date().toISOString());
}

function getDaysUntil(dayOfMonth) {
  const today = new Date();
  const due = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  if (due < today) due.setMonth(due.getMonth() + 1);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// ── DASHBOARD ──
let dashCharts = {};

function renderDashboard() {
  const cm = currentMonth();
  const thisMonth = STATE.transactions.filter(t => getMonthKey(t.date) === cm);

  const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings = income - spent;
  const totalDebt = STATE.loans.reduce((s, l) => s + l.balance, 0);

  document.getElementById('kpi-income').textContent = fmt(income);
  document.getElementById('kpi-spent').textContent = fmt(spent);
  document.getElementById('kpi-savings').textContent = fmt(savings);
  document.getElementById('kpi-debt').textContent = fmt(totalDebt);

  const spentPct = income > 0 ? Math.round((spent / income) * 100) : 0;
  document.getElementById('kpi-spent-pct').textContent = `${spentPct}% of income`;
  document.getElementById('kpi-spent-pct').className = 'kpi-delta ' + (spentPct > 80 ? 'negative' : '');

  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  document.getElementById('kpi-savings-pct').textContent = `${Math.max(0, savingsRate)}% savings rate`;
  document.getElementById('kpi-savings-pct').className = 'kpi-delta ' + (savingsRate >= 20 ? 'positive' : 'negative');

  // Health score
  const score = Math.min(100, Math.max(0,
    (savingsRate >= 30 ? 30 : savingsRate >= 15 ? 20 : savingsRate >= 0 ? 10 : 0) +
    (spentPct <= 60 ? 25 : spentPct <= 75 ? 18 : spentPct <= 90 ? 10 : 5) +
    (income > 0 ? 20 : 0) +
    (totalDebt === 0 ? 25 : totalDebt < income * 3 ? 18 : 10)
  ));

  document.getElementById('healthScoreNum').textContent = score;
  const offset = 314 - (314 * score / 100);
  document.getElementById('healthRing').setAttribute('stroke-dashoffset', offset);
  document.getElementById('healthRing').style.stroke =
    score >= 70 ? 'var(--accent)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';

  const debtRatio = income > 0 ? Math.min(100, Math.round((STATE.loans.reduce((s,l)=>s+l.emi,0)/income)*100)) : 0;
  const budgetCtrl = income > 0 ? Math.max(0, 100 - spentPct) : 0;

  document.getElementById('hbar-savings').style.width = Math.min(100, Math.max(0, savingsRate)) + '%';
  document.getElementById('hval-savings').textContent = Math.max(0, savingsRate) + '%';
  document.getElementById('hbar-debt').style.width = debtRatio + '%';
  document.getElementById('hval-debt').textContent = debtRatio + '%';
  document.getElementById('hbar-budget').style.width = budgetCtrl + '%';
  document.getElementById('hval-budget').textContent = budgetCtrl + '%';

  // Nudge
  const nudges = [
    savingsRate < 10 && income > 0 ? '⚠️ Your savings rate is below 10%. Try to cut discretionary spending.' : null,
    savingsRate >= 20 ? '🎯 Great! You\'re saving over 20% this month. Consistent savings = wealth.' : null,
    spentPct > 90 && income > 0 ? '🚨 You\'ve spent over 90% of your income. Review your expenses.' : null,
    debtRatio > 40 ? '💳 EMIs are taking over 40% of your income — high debt load.' : null,
    totalDebt === 0 ? '🏆 Debt-free! Consider investing your surplus.' : null,
    '💡 Track every rupee — awareness is the first step to financial freedom.'
  ].filter(Boolean);
  document.getElementById('nudgeText').textContent = nudges[0] || nudges[nudges.length - 1];

  // Recent transactions
  const list = document.getElementById('recentTxnList');
  const recent = STATE.transactions.slice(0, 8);
  if (!recent.length) {
    list.innerHTML = '<div class="empty-state">No transactions yet. Add your first one!</div>';
  } else {
    list.innerHTML = recent.map(t => `
      <div class="txn-item">
        <div class="cat-icon" style="background:${t.type==='income'?'var(--accent-dim)':'var(--surface-2)'}">
          ${CATEGORY_ICONS[t.category] || '📌'}
        </div>
        <div class="txn-meta">
          <div class="txn-desc">${escHtml(t.desc)}</div>
          <div class="txn-cat-date">${t.category} · ${formatDate(t.date)}</div>
        </div>
        <div class="txn-amount ${t.type}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</div>
      </div>
    `).join('');
  }

  renderDashboardCharts();
}

function renderDashboardCharts() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'rgba(240,240,255,0.5)' : 'rgba(15,15,26,0.5)';

  // Spending Trend
  const months = getLast6Months();
  const spendData = months.map(m => STATE.transactions.filter(t => t.type==='expense' && getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0));
  const incomeData = months.map(m => STATE.transactions.filter(t => t.type==='income' && getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0));

  if (dashCharts.trend) dashCharts.trend.destroy();
  dashCharts.trend = new Chart(document.getElementById('spendingTrendChart'), {
    type: 'line',
    data: {
      labels: months.map(getMonthLabel),
      datasets: [
        { label: 'Expenses', data: spendData, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#f87171', pointRadius: 4 },
        { label: 'Income', data: incomeData, borderColor: '#6ee7b7', backgroundColor: 'rgba(110,231,183,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#6ee7b7', pointRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: v => '₹' + (v >= 1000 ? Math.round(v/1000)+'k' : v) } }
      }
    }
  });

  // Category Donut
  const cm = currentMonth();
  const catMap = {};
  STATE.transactions.filter(t => t.type === 'expense' && getMonthKey(t.date) === cm).forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const catKeys = Object.keys(catMap);
  const catVals = catKeys.map(k => catMap[k]);

  if (dashCharts.donut) dashCharts.donut.destroy();
  dashCharts.donut = new Chart(document.getElementById('categoryDonut'), {
    type: 'doughnut',
    data: {
      labels: catKeys,
      datasets: [{ data: catVals, backgroundColor: CATEGORY_COLORS.slice(0, catKeys.length), borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { display: false } }
    }
  });

  // Donut legend
  const totalSpent = catVals.reduce((s, v) => s + v, 0);
  const legendEl = document.getElementById('donutLegend');
  if (catKeys.length) {
    legendEl.innerHTML = catKeys.map((k, i) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}"></div>
        <span class="legend-name">${k}</span>
        <span class="legend-val">${totalSpent > 0 ? Math.round((catVals[i]/totalSpent)*100) : 0}%</span>
      </div>
    `).join('');
  } else {
    legendEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:8px">No expenses this month</div>';
  }
}

function getLast6Months() {
  const result = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    result.push(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`);
  }
  return result;
}

// ── TRANSACTIONS PAGE ──
function renderTransactionPage() {
  populateTxnFilters();
  const search = (document.getElementById('txnSearch')?.value || '').toLowerCase();
  const cat = document.getElementById('txnCatFilter')?.value || '';
  const type = document.getElementById('txnTypeFilter')?.value || '';
  const month = document.getElementById('txnMonthFilter')?.value || '';

  let txns = STATE.transactions;
  if (search) txns = txns.filter(t => t.desc.toLowerCase().includes(search) || t.category.toLowerCase().includes(search));
  if (cat) txns = txns.filter(t => t.category === cat);
  if (type) txns = txns.filter(t => t.type === type);
  if (month) txns = txns.filter(t => getMonthKey(t.date) === month);

  const tbody = document.getElementById('txnTableBody');
  const empty = document.getElementById('txnEmpty');

  if (!txns.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = txns.map(t => `
      <tr>
        <td style="color:var(--text-secondary)">${formatDate(t.date)}</td>
        <td>
          <div style="font-weight:500">${escHtml(t.desc)}</div>
          ${t.notes ? `<div style="font-size:11px;color:var(--text-muted)">${escHtml(t.notes)}</div>` : ''}
        </td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:var(--text-secondary)">
            ${CATEGORY_ICONS[t.category] || '📌'} ${t.category}
          </span>
        </td>
        <td><span class="type-badge ${t.type}">${t.type}</span></td>
        <td class="txn-amount ${t.type}" style="font-size:14px;font-weight:600;font-family:var(--font-display)">
          ${t.type==='income'?'+':'-'}${fmt(t.amount)}
        </td>
        <td><button class="delete-btn" onclick="deleteTxn(${t.id})">✕</button></td>
      </tr>
    `).join('');
  }
}

function populateTxnFilters() {
  const cats = [...new Set(STATE.transactions.map(t => t.category))].sort();
  const catSel = document.getElementById('txnCatFilter');
  const curCat = catSel?.value;
  if (catSel) {
    catSel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    if (curCat) catSel.value = curCat;
  }

  const months = [...new Set(STATE.transactions.map(t => getMonthKey(t.date)))].sort().reverse();
  const mSel = document.getElementById('txnMonthFilter');
  const curM = mSel?.value;
  if (mSel) {
    mSel.innerHTML = '<option value="">All Months</option>' + months.map(m => `<option value="${m}">${getMonthLabel(m)}</option>`).join('');
    if (curM) mSel.value = curM;
  }
}

// ── ANALYTICS ──
let analyticsCharts = {};

function renderAnalytics() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'rgba(240,240,255,0.5)' : 'rgba(15,15,26,0.5)';
  const months = getLast6Months();

  // Income vs Expense
  const incData = months.map(m => STATE.transactions.filter(t=>t.type==='income'&&getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0));
  const expData = months.map(m => STATE.transactions.filter(t=>t.type==='expense'&&getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0));

  if (analyticsCharts.ie) analyticsCharts.ie.destroy();
  analyticsCharts.ie = new Chart(document.getElementById('incomeExpenseChart'), {
    type: 'bar',
    data: {
      labels: months.map(getMonthLabel),
      datasets: [
        { label: 'Income', data: incData, backgroundColor: 'rgba(110,231,183,0.7)', borderRadius: 6 },
        { label: 'Expenses', data: expData, backgroundColor: 'rgba(248,113,113,0.7)', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: v => '₹' + (v>=1000?Math.round(v/1000)+'k':v) } }
      }
    }
  });

  // Category Bar
  const catMap = {};
  STATE.transactions.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const sortedCats = Object.entries(catMap).sort((a,b) => b[1]-a[1]).slice(0, 8);

  if (analyticsCharts.cat) analyticsCharts.cat.destroy();
  analyticsCharts.cat = new Chart(document.getElementById('categoryBarChart'), {
    type: 'bar',
    data: {
      labels: sortedCats.map(([k]) => k),
      datasets: [{ data: sortedCats.map(([,v]) => v), backgroundColor: CATEGORY_COLORS.slice(0, sortedCats.length), borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: v => '₹'+(v>=1000?Math.round(v/1000)+'k':v) } },
        y: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } }
      }
    }
  });

  // Savings Rate Line
  const savingsRates = months.map(m => {
    const inc = STATE.transactions.filter(t=>t.type==='income'&&getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0);
    const exp = STATE.transactions.filter(t=>t.type==='expense'&&getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0);
    return inc > 0 ? Math.round(((inc-exp)/inc)*100) : 0;
  });

  if (analyticsCharts.savings) analyticsCharts.savings.destroy();
  analyticsCharts.savings = new Chart(document.getElementById('savingsRateChart'), {
    type: 'line',
    data: {
      labels: months.map(getMonthLabel),
      datasets: [{ label: 'Savings Rate %', data: savingsRates, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#60a5fa', pointRadius: 5 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: v => v + '%' }, min: 0, max: 100 }
      }
    }
  });

  // Heatmap - last 28 days
  renderHeatmap();
}

function renderHeatmap() {
  const container = document.getElementById('heatmapContainer');
  const days = 28;
  const today = new Date();
  const daySpending = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const spent = STATE.transactions.filter(t => t.date === key && t.type === 'expense').reduce((s,t) => s+t.amount, 0);
    daySpending.push({ date: key, spent });
  }

  const maxSpend = Math.max(...daySpending.map(d => d.spent), 1);
  const monthLabels = ['M','T','W','T','F','S','S'];

  container.innerHTML = `
    <div style="display:flex;gap:4px;margin-bottom:6px;padding:0 8px;">
      ${monthLabels.map(l => `<div style="flex:1;text-align:center;font-size:10px;color:var(--text-muted)">${l}</div>`).join('')}
    </div>
    <div class="heatmap-grid">
      ${daySpending.map(d => {
        const pct = d.spent / maxSpend;
        const lvl = pct === 0 ? 0 : pct < 0.25 ? 1 : pct < 0.5 ? 2 : pct < 0.75 ? 3 : 4;
        return `<div class="heatmap-day lvl-${lvl}" title="${d.date}: ${fmt(d.spent)}"></div>`;
      }).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:6px;padding:8px;font-size:10px;color:var(--text-muted)">
      Less
      ${[0,1,2,3,4].map(l => `<div class="heatmap-day lvl-${l}" style="width:12px;height:12px;flex-shrink:0"></div>`).join('')}
      More
    </div>
  `;
}

// ── LOANS ──
function renderLoans() {
  const totalDebt = STATE.loans.reduce((s, l) => s + l.balance, 0);
  const totalEMI = STATE.loans.reduce((s, l) => s + l.emi, 0);
  const avgRate = STATE.loans.length > 0 ? (STATE.loans.reduce((s, l) => s + (l.rate||0), 0) / STATE.loans.length).toFixed(1) : 0;
  const cm = currentMonth();
  const monthIncome = STATE.transactions.filter(t => t.type === 'income' && getMonthKey(t.date) === cm).reduce((s,t)=>s+t.amount, 0);
  const dti = monthIncome > 0 ? Math.round((totalEMI / monthIncome) * 100) : 0;

  document.getElementById('loan-total').textContent = fmt(totalDebt);
  document.getElementById('loan-emi').textContent = fmt(totalEMI);
  document.getElementById('loan-rate').textContent = avgRate + '%';
  document.getElementById('loan-dti').textContent = dti + '%';

  const container = document.getElementById('loansList');
  if (!STATE.loans.length) {
    container.innerHTML = '<div class="empty-state">No loans added yet. Add your first loan.</div>';
    return;
  }

  container.innerHTML = STATE.loans.map(l => {
    const paid = l.principal - l.balance;
    const pct = l.principal > 0 ? Math.min(100, Math.round((paid / l.principal) * 100)) : 0;
    const daysUntil = getDaysUntil(l.dueDay);
    return `
      <div class="loan-card">
        <div class="loan-header">
          <div class="loan-name-wrap">
            <span class="loan-badge">${l.type}</span>
            <span class="loan-name-text">${escHtml(l.name)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="loan-amount">${fmt(l.balance)}</div>
            <button class="delete-btn" onclick="deleteLoan(${l.id})">✕</button>
          </div>
        </div>
        <div class="loan-meta">
          <div class="loan-meta-item">
            <span class="loan-meta-label">Monthly EMI</span>
            <span class="loan-meta-value">${fmt(l.emi)}</span>
          </div>
          <div class="loan-meta-item">
            <span class="loan-meta-label">Interest Rate</span>
            <span class="loan-meta-value">${l.rate || 0}% p.a.</span>
          </div>
          <div class="loan-meta-item">
            <span class="loan-meta-label">Principal</span>
            <span class="loan-meta-value">${fmt(l.principal)}</span>
          </div>
          <div class="loan-meta-item">
            <span class="loan-meta-label">Due Date</span>
            <span class="loan-meta-value" style="color:${daysUntil <= 5 ? 'var(--danger)' : 'var(--text-primary)'}">
              ${daysUntil <= 5 ? '⚠️ ' : ''}${daysUntil}d away (${l.dueDay}th)
            </span>
          </div>
        </div>
        <div>
          <div class="progress-label" style="margin-bottom:4px">
            <span>Repaid: ${fmt(paid)}</span>
            <span>${pct}% paid</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── RECURRING ──
function renderRecurring() {
  const monthly = STATE.recurring.reduce((s, r) => {
    const m = r.frequency === 'yearly' ? r.amount/12 : r.frequency === 'weekly' ? r.amount*4 : r.frequency === 'quarterly' ? r.amount/3 : r.amount;
    return s + m;
  }, 0);
  const annual = STATE.recurring.reduce((s, r) => {
    const y = r.frequency === 'yearly' ? r.amount : r.frequency === 'weekly' ? r.amount*52 : r.frequency === 'quarterly' ? r.amount*4 : r.amount*12;
    return s + y;
  }, 0);
  const dueThisWeek = STATE.recurring.filter(r => getDaysUntil(r.dueDay) <= 7).length;

  document.getElementById('rec-monthly').textContent = fmt(monthly);
  document.getElementById('rec-annual').textContent = fmt(annual);
  document.getElementById('rec-count').textContent = STATE.recurring.length;
  document.getElementById('rec-due').textContent = dueThisWeek;

  const container = document.getElementById('recurringGrid');
  if (!STATE.recurring.length) {
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No recurring payments added yet.</div>';
    return;
  }

  const freqLabel = { monthly: 'Monthly', yearly: 'Yearly', weekly: 'Weekly', quarterly: 'Quarterly' };

  container.innerHTML = STATE.recurring.map(r => {
    const days = getDaysUntil(r.dueDay);
    const urgent = days <= 3;
    return `
      <div class="rec-card" style="${urgent ? 'border-color:rgba(251,191,36,0.4)' : ''}">
        <div class="rec-top">
          <span class="rec-name">${escHtml(r.name)}</span>
          <span class="rec-freq">${freqLabel[r.frequency] || r.frequency}</span>
        </div>
        <div class="rec-amount">${fmt(r.amount)}</div>
        <div class="rec-meta">
          <span class="rec-cat">${r.category}</span>
          <span class="rec-due" style="${urgent ? 'color:var(--danger)' : ''}">${urgent ? '⚠️ ' : ''}Due in ${days}d</span>
        </div>
        <div style="text-align:right">
          <button class="delete-btn" onclick="deleteRecurring(${r.id})">Remove</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── INSIGHTS ──
function renderInsights() {
  const cm = currentMonth();
  const thisMonth = STATE.transactions.filter(t => getMonthKey(t.date) === cm);
  const income = thisMonth.filter(t => t.type === 'income').reduce((s,t)=>s+t.amount, 0);
  const spent = thisMonth.filter(t => t.type === 'expense').reduce((s,t)=>s+t.amount, 0);
  const savingsRate = income > 0 ? Math.round(((income-spent)/income)*100) : 0;
  const totalDebt = STATE.loans.reduce((s,l)=>s+l.balance, 0);

  // Category analysis
  const catMap = {};
  thisMonth.filter(t=>t.type==='expense').forEach(t => { catMap[t.category] = (catMap[t.category]||0) + t.amount; });
  const topCat = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];

  // Recurring burden
  const recMonthly = STATE.recurring.reduce((s,r) => {
    return s + (r.frequency==='yearly'?r.amount/12:r.frequency==='weekly'?r.amount*4:r.frequency==='quarterly'?r.amount/3:r.amount);
  }, 0);

  const insights = [
    {
      icon: '📊', title: 'Savings Rate Analysis',
      body: income > 0
        ? `You saved ${Math.max(0,savingsRate)}% of your income this month. ${savingsRate >= 30 ? 'Excellent! You\'re well above the recommended 20% threshold.' : savingsRate >= 20 ? 'Good job! Aim to push this to 30% for faster wealth building.' : 'Try to reduce discretionary spending to hit 20%+ savings.'}`
        : 'Add income transactions to see your savings rate analysis.',
      badge: savingsRate >= 20 ? { text: '✓ On Track', cls: 'badge-positive' } : { text: '↑ Needs Improvement', cls: 'badge-warning' }
    },
    {
      icon: '🍽️', title: 'Top Spending Category',
      body: topCat
        ? `Your biggest expense this month is ${topCat[0]} at ${fmt(topCat[1])} (${income > 0 ? Math.round((topCat[1]/income)*100) : 0}% of income). ${topCat[0] === 'Food' ? 'Consider meal prepping to reduce dining-out costs.' : topCat[0] === 'Shopping' ? 'Try the 24-hour rule before impulse purchases.' : 'Review if this is within your budget plan.'}`
        : 'No expense data for this month yet.',
      badge: topCat && income > 0 && topCat[1]/income > 0.3 ? { text: '⚠ High Spend', cls: 'badge-danger' } : { text: '✓ Normal', cls: 'badge-positive' }
    },
    {
      icon: '💳', title: 'Debt Health',
      body: totalDebt > 0
        ? `Your total outstanding debt is ${fmt(totalDebt)} across ${STATE.loans.length} loan${STATE.loans.length>1?'s':''}. Monthly EMI load is ${fmt(STATE.loans.reduce((s,l)=>s+l.emi,0))}. ${income > 0 && STATE.loans.reduce((s,l)=>s+l.emi,0)/income > 0.4 ? 'Your debt-to-income ratio is high. Consider prepaying high-interest loans.' : 'Your debt load appears manageable.'}`
        : 'No loans or liabilities tracked. Great start, or add your loans for debt health tracking.',
      badge: totalDebt === 0 ? { text: '🏆 Debt Free', cls: 'badge-positive' } : { text: 'Track Actively', cls: 'badge-info' }
    },
    {
      icon: '🔄', title: 'Subscription Fatigue Check',
      body: recMonthly > 0
        ? `You have ${STATE.recurring.length} recurring commitments totalling ${fmt(recMonthly)}/month (₹${Math.round(recMonthly*12/1000)}k/year). ${recMonthly > 5000 ? 'Consider auditing your subscriptions — small amounts add up.' : 'Subscription load looks healthy.'}`
        : 'No recurring payments tracked. Add your subscriptions, SIPs, and EMIs to stay on top of them.',
      badge: recMonthly > 5000 ? { text: 'Audit Suggested', cls: 'badge-warning' } : { text: '✓ Healthy', cls: 'badge-positive' }
    },
    {
      icon: '💡', title: 'Mindful Spending Nudge',
      body: 'The 50/30/20 rule: 50% needs (rent, groceries, EMIs), 30% wants (dining, entertainment, shopping), 20% savings and investments. Small, consistent choices outperform occasional windfalls.',
      badge: { text: 'Behavioural Finance', cls: 'badge-info' }
    },
    {
      icon: '📅', title: 'Due Date Watch',
      body: STATE.recurring.filter(r => getDaysUntil(r.dueDay) <= 7).length > 0
        ? `You have ${STATE.recurring.filter(r=>getDaysUntil(r.dueDay)<=7).length} payment(s) due in the next 7 days: ${STATE.recurring.filter(r=>getDaysUntil(r.dueDay)<=7).map(r=>r.name).join(', ')}. Ensure sufficient balance.`
        : 'No payments due in the next 7 days. You\'re in the clear.',
      badge: STATE.recurring.filter(r=>getDaysUntil(r.dueDay)<=3).length > 0 ? { text: '⚠ Due Soon', cls: 'badge-danger' } : { text: '✓ Clear', cls: 'badge-positive' }
    }
  ];

  document.getElementById('insightsGrid').innerHTML = insights.map(ins => `
    <div class="insight-card">
      <div class="insight-icon">${ins.icon}</div>
      <div class="insight-title">${ins.title}</div>
      <div class="insight-body">${ins.body}</div>
      <span class="insight-badge ${ins.badge.cls}">${ins.badge.text}</span>
    </div>
  `).join('');
}

// ── LEDGER ──
function renderLedger() {
  const container = document.getElementById('ledgerContent');
  if (!STATE.transactions.length) {
    container.innerHTML = '<div class="empty-state">No transaction history yet.</div>';
    return;
  }

  const byMonth = {};
  STATE.transactions.forEach(t => {
    const m = getMonthKey(t.date);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(t);
  });

  const sortedMonths = Object.keys(byMonth).sort().reverse();

  container.innerHTML = sortedMonths.map(m => {
    const txns = byMonth[m];
    const inc = txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount, 0);
    const exp = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount, 0);
    return `
      <div class="ledger-month">
        <div class="ledger-month-header">
          <span class="ledger-month-title">${getMonthLabel(m)}</span>
          <div class="ledger-month-summary">
            <span class="ledger-month-income">+${fmt(inc)}</span>
            <span class="ledger-month-expense">-${fmt(exp)}</span>
            <span style="color:${inc-exp>=0?'var(--accent)':'var(--danger)'};font-weight:600;font-size:12px">
              Net: ${fmt(inc-exp)}
            </span>
          </div>
        </div>
        <div class="ledger-month-table">
          <table class="txn-table">
            <thead><tr>
              <th>Date</th><th>Description</th><th>Category</th><th>Mode</th><th>Amount</th>
            </tr></thead>
            <tbody>
              ${txns.map(t => `
                <tr>
                  <td style="color:var(--text-secondary)">${formatDate(t.date)}</td>
                  <td>${escHtml(t.desc)}</td>
                  <td style="color:var(--text-secondary)">${CATEGORY_ICONS[t.category]||'📌'} ${t.category}</td>
                  <td style="color:var(--text-muted);font-size:12px">${t.mode}</td>
                  <td class="txn-amount ${t.type}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

// ── EXPORT ──
function exportCSV() {
  const rows = [['Date','Description','Category','Type','Amount','Mode','Notes']];
  STATE.transactions.forEach(t => {
    rows.push([t.date, t.desc, t.category, t.type, t.amount, t.mode, t.notes || '']);
  });
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finio-transactions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported ✓');
}

// ── TOAST ──
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderLeftColor = type === 'error' ? 'var(--danger)' : 'var(--accent)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── UTIL ──
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── SEED DATA (if empty) ──
function seedSampleData() {
  if (STATE.transactions.length > 0) return;
  const today = new Date();
  const makeDate = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const sampleTxns = [
    { id: 1, type: 'income', amount: 85000, desc: 'Monthly Salary — JAL', category: 'Salary', date: makeDate(1), mode: 'NetBanking', notes: 'May 2026 salary', recurring: true },
    { id: 2, type: 'expense', amount: 1299, desc: 'Netflix Premium', category: 'Subscriptions', date: makeDate(2), mode: 'Card', notes: '', recurring: true },
    { id: 3, type: 'expense', amount: 3400, desc: 'Grocery & Vegetables', category: 'Food', date: makeDate(3), mode: 'UPI', notes: 'Bigbasket order', recurring: false },
    { id: 4, type: 'expense', amount: 2200, desc: 'Petrol', category: 'Transport', date: makeDate(4), mode: 'UPI', notes: '', recurring: false },
    { id: 5, type: 'expense', amount: 1850, desc: 'Zomato Orders', category: 'Food', date: makeDate(5), mode: 'UPI', notes: 'Weekend orders', recurring: false },
    { id: 6, type: 'expense', amount: 15000, desc: 'Home Loan EMI', category: 'EMI', date: makeDate(5), mode: 'NetBanking', notes: 'SBI Home Loan', recurring: true },
    { id: 7, type: 'expense', amount: 499, desc: 'Spotify Premium', category: 'Subscriptions', date: makeDate(6), mode: 'Card', notes: '', recurring: true },
    { id: 8, type: 'income', amount: 12000, desc: 'Freelance Content Project', category: 'Freelance', date: makeDate(7), mode: 'UPI', notes: '', recurring: false },
    { id: 9, type: 'expense', amount: 5000, desc: 'SIP — Mirae Asset', category: 'Investment', date: makeDate(8), mode: 'NetBanking', notes: 'Monthly SIP auto-debit', recurring: true },
    { id: 10, type: 'expense', amount: 800, desc: 'Electricity Bill', category: 'Utilities', date: makeDate(9), mode: 'UPI', notes: 'BESCOM', recurring: true },
    { id: 11, type: 'expense', amount: 3200, desc: 'Clothing — H&M', category: 'Shopping', date: makeDate(10), mode: 'Card', notes: '', recurring: false },
    { id: 12, type: 'expense', amount: 650, desc: 'Doctor Consultation', category: 'Health', date: makeDate(12), mode: 'UPI', notes: '', recurring: false },
    // Previous month
    { id: 13, type: 'income', amount: 85000, desc: 'Monthly Salary — JAL', category: 'Salary', date: makeDate(32), mode: 'NetBanking', notes: '', recurring: true },
    { id: 14, type: 'expense', amount: 18000, desc: 'Rent', category: 'Rent', date: makeDate(33), mode: 'NetBanking', notes: '', recurring: true },
    { id: 15, type: 'expense', amount: 4500, desc: 'Food & Dining', category: 'Food', date: makeDate(35), mode: 'UPI', notes: '', recurring: false },
    { id: 16, type: 'expense', amount: 15000, desc: 'Home Loan EMI', category: 'EMI', date: makeDate(35), mode: 'NetBanking', notes: '', recurring: true },
    { id: 17, type: 'expense', amount: 5000, desc: 'SIP — Mirae Asset', category: 'Investment', date: makeDate(38), mode: 'NetBanking', notes: '', recurring: true },
    { id: 18, type: 'expense', amount: 2800, desc: 'Weekend Outing', category: 'Entertainment', date: makeDate(40), mode: 'Card', notes: '', recurring: false },
    { id: 19, type: 'income', amount: 8000, desc: 'Side Project Income', category: 'Freelance', date: makeDate(45), mode: 'UPI', notes: '', recurring: false },
    { id: 20, type: 'expense', amount: 1200, desc: 'Mobile Bill', category: 'Utilities', date: makeDate(48), mode: 'Card', notes: '', recurring: true },
  ];

  STATE.transactions = sampleTxns;
  STATE.loans = [
    { id: 1, name: 'SBI Home Loan', principal: 3500000, balance: 2800000, emi: 15000, rate: 8.5, dueDay: 5, type: 'Home Loan' },
    { id: 2, name: 'HDFC Personal Loan', principal: 200000, balance: 85000, emi: 8500, rate: 12, dueDay: 10, type: 'Personal Loan' },
  ];
  STATE.recurring = [
    { id: 1, name: 'Netflix Premium', amount: 1299, frequency: 'monthly', category: 'Subscription', dueDay: 12 },
    { id: 2, name: 'Spotify', amount: 499, frequency: 'monthly', category: 'Subscription', dueDay: 15 },
    { id: 3, name: 'Mirae Asset SIP', amount: 5000, frequency: 'monthly', category: 'SIP', dueDay: 8 },
    { id: 4, name: 'Electricity (BESCOM)', amount: 800, frequency: 'monthly', category: 'Utility', dueDay: 20 },
    { id: 5, name: 'Mobile Bill — Airtel', amount: 1199, frequency: 'monthly', category: 'Utility', dueDay: 18 },
    { id: 6, name: 'Term Life Insurance', amount: 24000, frequency: 'yearly', category: 'Insurance', dueDay: 1 },
  ];
  save();
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  const savedTheme = localStorage.getItem('finio_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Load data
  load();
  seedSampleData();

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.getAttribute('data-page'));
    });
  });

  // Theme toggles
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('themeToggleMobile').addEventListener('click', toggleTheme);

  // Hamburger
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Chart tab switching (trend)
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderDashboardCharts();
    });
  });

  // Initial render
  renderDashboard();
});
