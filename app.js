/* ============================================================
   Finio — app.js  v3
   Auth + multi-user storage + all finance modules
   ============================================================ */

/* ── CONSTANTS ── */
const CATEGORY_ICONS = {
  Food:'🍔', Transport:'🚗', Shopping:'🛍️', Entertainment:'🎬',
  Utilities:'💡', Health:'💊', Subscriptions:'📱', EMI:'🏦',
  Rent:'🏠', Investment:'📈', Salary:'💼', Freelance:'💻', Other:'📌'
};
const CATEGORY_COLORS = [
  '#6ee7b7','#60a5fa','#f87171','#fbbf24','#a78bfa',
  '#34d399','#fb923c','#38bdf8','#e879f9','#4ade80'
];
const ASSET_ICONS = {
  'Cash & Savings':'🏦','Mutual Funds':'📈','Stocks':'📊',
  'FD / RD':'🏛️','PPF / EPF':'🛡️','Real Estate':'🏠',
  'Gold':'🪙','Crypto':'₿','Other':'💼'
};
const GOAL_EMOJIS = {
  'Emergency Fund':'🛡️','Travel':'✈️','Gadget':'💻',
  'Vehicle':'🚗','Home':'🏠','Education':'🎓',
  'Wedding':'💍','Retirement':'🌅','Other':'🎯'
};

/* ── STATE ── */
let CURRENT_USER = null; // { email, name, initials }
let IS_DEMO = false;

const STATE = {
  transactions:[], loans:[], recurring:[],
  budgets:[], goals:[], assets:[], liabilities:[],
  txnType:'expense'
};

/* ══════════════════════════════════════
   AUTH
   ══════════════════════════════════════ */

function switchPanel(panel) {
  document.getElementById('loginPanel').style.display    = panel === 'login'    ? 'block' : 'none';
  document.getElementById('registerPanel').style.display = panel === 'register' ? 'block' : 'none';
  document.getElementById('loginError').textContent = '';
  document.getElementById('regError').textContent   = '';
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  inp.type  = inp.type === 'password' ? 'text' : 'password';
}

function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pw    = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');

  if (!email || !pw) { errEl.textContent = 'Please fill in all fields.'; return; }

  const users = JSON.parse(localStorage.getItem('finio_users') || '{}');
  if (!users[email]) { errEl.textContent = 'No account found. Please register first.'; return; }
  if (users[email].password !== btoa(pw)) { errEl.textContent = 'Incorrect password.'; return; }

  loginUser(email, users[email].name, false);
}

function handleRegister() {
  const first  = document.getElementById('regFirst').value.trim();
  const last   = document.getElementById('regLast').value.trim();
  const email  = document.getElementById('regEmail').value.trim().toLowerCase();
  const income = parseFloat(document.getElementById('regIncome').value) || 0;
  const pw     = document.getElementById('regPassword').value;
  const errEl  = document.getElementById('regError');

  if (!first || !email || !pw) { errEl.textContent = 'First name, email, and password are required.'; return; }
  if (pw.length < 6)           { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (!email.includes('@'))    { errEl.textContent = 'Please enter a valid email address.'; return; }

  const users = JSON.parse(localStorage.getItem('finio_users') || '{}');
  if (users[email])            { errEl.textContent = 'An account with this email already exists.'; return; }

  const name = last ? `${first} ${last}` : first;
  users[email] = { name, password: btoa(pw) };
  localStorage.setItem('finio_users', JSON.stringify(users));

  // Pre-seed monthly income if provided
  if (income > 0) {
    const today = new Date().toISOString().split('T')[0];
    const seedTxn = [{ id: Date.now(), type:'income', amount:income, desc:'Monthly Salary / Income', category:'Salary', date:today, mode:'NetBanking', notes:'', recurring:true }];
    localStorage.setItem(`finio_${email}_transactions`, JSON.stringify(seedTxn));
  }

  loginUser(email, name, false);
}

function handleDemo() {
  IS_DEMO = true;
  CURRENT_USER = { email: 'demo', name: 'Demo User', initials: 'DU' };
  loadDemoData();
  bootApp();
}

function loginUser(email, name, isDemo) {
  IS_DEMO = isDemo;
  const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0,2);
  CURRENT_USER = { email, name, initials };
  localStorage.setItem('finio_session', JSON.stringify(CURRENT_USER));
  loadUserData(email);
  bootApp();
}

function handleLogout() {
  if (IS_DEMO) {
    // Wipe demo data from STATE only — nothing was saved to localStorage
    Object.assign(STATE, { transactions:[], loans:[], recurring:[], budgets:[], goals:[], assets:[], liabilities:[] });
  }
  CURRENT_USER = null;
  IS_DEMO = false;
  localStorage.removeItem('finio_session');
  destroyAllCharts();
  document.getElementById('appScreen').style.display  = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('loginEmail').value    = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').textContent = '';
  switchPanel('login');
}

function clearSampleAndStart() {
  // Wipe sample data, stay logged in as demo user, show empty dashboard
  Object.assign(STATE, { transactions:[], loans:[], recurring:[], budgets:[], goals:[], assets:[], liabilities:[] });
  IS_DEMO = false;
  document.getElementById('disclaimerBanner').style.display = 'none';
  renderDashboard();
  showToast('Sample data cleared. Start adding your own transactions!');
}

/* ── STORAGE (per-user keys) ── */
function userKey(k) { return `finio_${CURRENT_USER.email}_${k}`; }

function save() {
  if (IS_DEMO) return; // demo: in-memory only, never persist
  const keys = ['transactions','loans','recurring','budgets','goals','assets','liabilities'];
  keys.forEach(k => localStorage.setItem(userKey(k), JSON.stringify(STATE[k] || [])));
}

function loadUserData(email) {
  const keys = ['transactions','loans','recurring','budgets','goals','assets','liabilities'];
  keys.forEach(k => {
    STATE[k] = JSON.parse(localStorage.getItem(`finio_${email}_${k}`) || '[]');
  });
}

function loadDemoData() {
  const today = new Date();
  const d = (n) => { const dt = new Date(today); dt.setDate(dt.getDate()-n); return dt.toISOString().split('T')[0]; };

  STATE.transactions = [
    { id:1,  type:'income',  amount:72000, desc:'Monthly Salary',        category:'Salary',        date:d(1),  mode:'NetBanking', notes:'',                   recurring:true  },
    { id:2,  type:'expense', amount:1299,  desc:'Netflix',               category:'Subscriptions', date:d(2),  mode:'Card',       notes:'',                   recurring:true  },
    { id:3,  type:'expense', amount:3100,  desc:'Grocery Shopping',      category:'Food',          date:d(3),  mode:'UPI',        notes:'Weekly groceries',    recurring:false },
    { id:4,  type:'expense', amount:1800,  desc:'Fuel',                  category:'Transport',     date:d(4),  mode:'UPI',        notes:'',                   recurring:false },
    { id:5,  type:'expense', amount:2200,  desc:'Restaurant & Zomato',   category:'Food',          date:d(5),  mode:'UPI',        notes:'Weekend dining',     recurring:false },
    { id:6,  type:'expense', amount:12000, desc:'Loan EMI',              category:'EMI',           date:d(5),  mode:'NetBanking', notes:'',                   recurring:true  },
    { id:7,  type:'expense', amount:499,   desc:'Spotify',               category:'Subscriptions', date:d(6),  mode:'Card',       notes:'',                   recurring:true  },
    { id:8,  type:'income',  amount:15000, desc:'Freelance Project',     category:'Freelance',     date:d(7),  mode:'UPI',        notes:'',                   recurring:false },
    { id:9,  type:'expense', amount:5000,  desc:'Monthly SIP',           category:'Investment',    date:d(8),  mode:'NetBanking', notes:'Index fund SIP',     recurring:true  },
    { id:10, type:'expense', amount:750,   desc:'Electricity Bill',      category:'Utilities',     date:d(9),  mode:'UPI',        notes:'',                   recurring:true  },
    { id:11, type:'expense', amount:2800,  desc:'Clothing & Shopping',   category:'Shopping',      date:d(10), mode:'Card',       notes:'',                   recurring:false },
    { id:12, type:'expense', amount:600,   desc:'Doctor Visit',          category:'Health',        date:d(12), mode:'UPI',        notes:'',                   recurring:false },
    { id:13, type:'income',  amount:72000, desc:'Monthly Salary',        category:'Salary',        date:d(32), mode:'NetBanking', notes:'',                   recurring:true  },
    { id:14, type:'expense', amount:16000, desc:'Rent',                  category:'Rent',          date:d(33), mode:'NetBanking', notes:'',                   recurring:true  },
    { id:15, type:'expense', amount:4200,  desc:'Food & Dining',         category:'Food',          date:d(35), mode:'UPI',        notes:'',                   recurring:false },
    { id:16, type:'expense', amount:12000, desc:'Loan EMI',              category:'EMI',           date:d(35), mode:'NetBanking', notes:'',                   recurring:true  },
    { id:17, type:'expense', amount:5000,  desc:'Monthly SIP',           category:'Investment',    date:d(38), mode:'NetBanking', notes:'',                   recurring:true  },
    { id:18, type:'expense', amount:2400,  desc:'Weekend Outing',        category:'Entertainment', date:d(40), mode:'Card',       notes:'',                   recurring:false },
    { id:19, type:'income',  amount:8000,  desc:'Side Income',           category:'Freelance',     date:d(45), mode:'UPI',        notes:'',                   recurring:false },
    { id:20, type:'expense', amount:1100,  desc:'Mobile Bill',           category:'Utilities',     date:d(48), mode:'Card',       notes:'',                   recurring:true  },
    { id:21, type:'income',  amount:72000, desc:'Monthly Salary',        category:'Salary',        date:d(62), mode:'NetBanking', notes:'',                   recurring:true  },
    { id:22, type:'expense', amount:16000, desc:'Rent',                  category:'Rent',          date:d(63), mode:'NetBanking', notes:'',                   recurring:true  },
    { id:23, type:'expense', amount:3800,  desc:'Groceries & Dining',    category:'Food',          date:d(66), mode:'UPI',        notes:'',                   recurring:false },
    { id:24, type:'expense', amount:12000, desc:'Loan EMI',              category:'EMI',           date:d(65), mode:'NetBanking', notes:'',                   recurring:true  },
    { id:25, type:'expense', amount:4500,  desc:'Shopping Haul',         category:'Shopping',      date:d(70), mode:'Card',       notes:'',                   recurring:false },
  ];

  STATE.loans = [
    { id:1, name:'Personal Loan', principal:400000, balance:260000, emi:12000, rate:11.5, dueDay:5,  type:'Personal Loan' },
    { id:2, name:'Car Loan',      principal:600000, balance:420000, emi:9500,  rate:8.9,  dueDay:10, type:'Car Loan'      },
  ];

  STATE.recurring = [
    { id:1, name:'Netflix',           amount:1299, frequency:'monthly',  category:'Subscription', dueDay:12 },
    { id:2, name:'Spotify',           amount:499,  frequency:'monthly',  category:'Subscription', dueDay:15 },
    { id:3, name:'Monthly SIP',       amount:5000, frequency:'monthly',  category:'SIP',          dueDay:8  },
    { id:4, name:'Electricity',       amount:750,  frequency:'monthly',  category:'Utility',      dueDay:20 },
    { id:5, name:'Mobile Bill',       amount:1099, frequency:'monthly',  category:'Utility',      dueDay:18 },
    { id:6, name:'Term Insurance',    amount:18000,frequency:'yearly',   category:'Insurance',    dueDay:1  },
  ];

  STATE.budgets = [
    { id:101, category:'Food',          amount:7000, alertPct:80 },
    { id:102, category:'Transport',     amount:3500, alertPct:80 },
    { id:103, category:'Entertainment', amount:3000, alertPct:80 },
    { id:104, category:'Subscriptions', amount:2500, alertPct:90 },
    { id:105, category:'Shopping',      amount:5000, alertPct:80 },
  ];

  const sixM  = new Date(); sixM.setMonth(sixM.getMonth()+6);
  const oneY  = new Date(); oneY.setFullYear(oneY.getFullYear()+1);
  const threeY= new Date(); threeY.setFullYear(threeY.getFullYear()+3);

  STATE.goals = [
    { id:201, name:'Emergency Fund (6 months)', target:300000, saved:75000,  monthly:15000, targetDate:sixM.toISOString().split('T')[0],   category:'Emergency Fund' },
    { id:202, name:'Europe Trip',               target:180000, saved:40000,  monthly:10000, targetDate:oneY.toISOString().split('T')[0],   category:'Travel'         },
    { id:203, name:'New Laptop',                target:150000, saved:50000,  monthly:8000,  targetDate:oneY.toISOString().split('T')[0],   category:'Gadget'         },
    { id:204, name:'Home Down Payment',         target:1500000,saved:250000, monthly:25000, targetDate:threeY.toISOString().split('T')[0], category:'Home'           },
  ];

  STATE.assets = [
    { id:301, name:'Savings Account',    value:110000, type:'Cash & Savings' },
    { id:302, name:'Index Fund SIP',     value:145000, type:'Mutual Funds'   },
    { id:303, name:'ELSS Fund',          value:80000,  type:'Mutual Funds'   },
    { id:304, name:'PPF Account',        value:195000, type:'PPF / EPF'      },
    { id:305, name:'EPF Balance',        value:280000, type:'PPF / EPF'      },
    { id:306, name:'Gold (40g)',         value:260000, type:'Gold'           },
    { id:307, name:'Bank FD (1 year)',   value:100000, type:'FD / RD'        },
  ];

  STATE.liabilities = [];
}

/* ── BOOT ── */
function bootApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display  = 'block';

  // Show disclaimer for demo users
  document.getElementById('disclaimerBanner').style.display = IS_DEMO ? 'block' : 'none';

  // Set user info in sidebar
  document.getElementById('userAvatar').textContent = CURRENT_USER.initials;
  document.getElementById('userName').textContent   = CURRENT_USER.name.split(' ')[0];

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = CURRENT_USER.name.split(' ')[0];
  document.getElementById('dashGreeting').innerHTML = `${greet}, ${escHtml(first)} <span class="wave">👋</span>`;
  document.getElementById('dashSub').textContent = `Here's your financial snapshot for ${new Date().toLocaleString('en-IN', {month:'long', year:'numeric'})}`;

  navigate('dashboard');
}

/* ══════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════ */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo(0,0);
  renderPage(page);
}

function renderPage(page) {
  switch(page) {
    case 'dashboard':    renderDashboard();        break;
    case 'transactions': renderTransactionPage();  break;
    case 'analytics':    renderAnalytics();        break;
    case 'budget':       renderBudget();           break;
    case 'goals':        renderGoals();            break;
    case 'loans':        renderLoans();            break;
    case 'recurring':    renderRecurring();        break;
    case 'networth':     renderNetWorth();         break;
    case 'insights':     renderInsights();         break;
    case 'ledger':       renderLedger();           break;
  }
}

/* ══════════════════════════════════════
   MODALS
   ══════════════════════════════════════ */
function openModal(id) {
  document.querySelectorAll('.modal-body').forEach(m => m.style.display = 'none');
  document.getElementById('modal-' + id).style.display = 'block';
  document.getElementById('modalOverlay').classList.add('open');
  if (id === 'addTransaction') {
    document.getElementById('txnDate').value = new Date().toISOString().split('T')[0];
  }
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

/* ══════════════════════════════════════
   THEME
   ══════════════════════════════════════ */
function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('finio_theme', next);
  setTimeout(() => renderDashboardCharts(), 100);
}

/* ══════════════════════════════════════
   TRANSACTIONS
   ══════════════════════════════════════ */
function setTxnType(type) {
  STATE.txnType = type;
  document.getElementById('typeExpense').classList.toggle('active', type==='expense');
  document.getElementById('typeIncome').classList.toggle('active', type==='income');
}

function saveTransaction() {
  const amount = parseFloat(document.getElementById('txnAmount').value);
  const desc   = document.getElementById('txnDesc').value.trim();
  const cat    = document.getElementById('txnCategory').value;
  const date   = document.getElementById('txnDate').value;
  const mode   = document.getElementById('txnMode').value;
  const notes  = document.getElementById('txnNotes').value.trim();
  const recur  = document.getElementById('txnRecurring').checked;

  if (!amount || amount <= 0) { showToast('Enter a valid amount','error'); return; }
  if (!desc)                  { showToast('Add a description','error');    return; }
  if (!date)                  { showToast('Select a date','error');        return; }

  STATE.transactions.unshift({ id:Date.now(), type:STATE.txnType, amount, desc, category:cat, date, mode, notes, recurring:recur });
  save();
  closeModal();
  showToast('Transaction saved ✓');
  document.getElementById('txnAmount').value = '';
  document.getElementById('txnDesc').value   = '';
  document.getElementById('txnNotes').value  = '';
  document.getElementById('txnRecurring').checked = false;
  renderDashboard();
}

function deleteTxn(id) {
  STATE.transactions = STATE.transactions.filter(t => t.id !== id);
  save();
  renderTransactionPage();
  renderDashboard();
  showToast('Transaction deleted');
}

/* ══════════════════════════════════════
   LOANS
   ══════════════════════════════════════ */
function saveLoan() {
  const name      = document.getElementById('loanName').value.trim();
  const principal = parseFloat(document.getElementById('loanPrincipal').value);
  const balance   = parseFloat(document.getElementById('loanBalance').value);
  const emi       = parseFloat(document.getElementById('loanEMI').value);
  const rate      = parseFloat(document.getElementById('loanRate').value);
  const dueDay    = parseInt(document.getElementById('loanDueDay').value) || 1;
  const type      = document.getElementById('loanType').value;
  if (!name || !principal || !balance || !emi) { showToast('Fill all required fields','error'); return; }
  STATE.loans.push({ id:Date.now(), name, principal, balance, emi, rate, dueDay, type });
  save(); closeModal(); showToast('Loan added ✓'); renderLoans();
  document.getElementById('loanName').value = '';
}

function deleteLoan(id) {
  STATE.loans = STATE.loans.filter(l => l.id !== id);
  save(); renderLoans(); showToast('Loan removed');
}

/* ══════════════════════════════════════
   RECURRING
   ══════════════════════════════════════ */
function saveRecurring() {
  const name  = document.getElementById('recName').value.trim();
  const amount= parseFloat(document.getElementById('recAmount').value);
  const freq  = document.getElementById('recFrequency').value;
  const cat   = document.getElementById('recCategory').value;
  const due   = parseInt(document.getElementById('recDueDay').value) || 1;
  if (!name || !amount) { showToast('Fill all required fields','error'); return; }
  STATE.recurring.push({ id:Date.now(), name, amount, frequency:freq, category:cat, dueDay:due });
  save(); closeModal(); showToast('Recurring payment added ✓'); renderRecurring();
  document.getElementById('recName').value = ''; document.getElementById('recAmount').value = '';
}

function deleteRecurring(id) {
  STATE.recurring = STATE.recurring.filter(r => r.id !== id);
  save(); renderRecurring(); showToast('Removed');
}

/* ══════════════════════════════════════
   BUDGET
   ══════════════════════════════════════ */
function saveBudget() {
  const cat      = document.getElementById('budCategory').value;
  const amount   = parseFloat(document.getElementById('budAmount').value);
  const alertPct = parseInt(document.getElementById('budAlertPct').value);
  if (!amount || amount <= 0) { showToast('Enter a valid budget amount','error'); return; }
  STATE.budgets = (STATE.budgets||[]).filter(b => b.category !== cat);
  STATE.budgets.push({ id:Date.now(), category:cat, amount, alertPct });
  save(); closeModal(); showToast(`Budget set for ${cat} ✓`); renderBudget(); renderDashboard();
}

function deleteBudget(id) {
  STATE.budgets = (STATE.budgets||[]).filter(b => b.id !== id);
  save(); renderBudget(); renderDashboard(); showToast('Budget removed');
}

/* ══════════════════════════════════════
   GOALS
   ══════════════════════════════════════ */
function saveGoal() {
  const name    = document.getElementById('goalName').value.trim();
  const target  = parseFloat(document.getElementById('goalTarget').value);
  const saved   = parseFloat(document.getElementById('goalSaved').value) || 0;
  const monthly = parseFloat(document.getElementById('goalMonthly').value) || 0;
  const date    = document.getElementById('goalDate').value;
  const cat     = document.getElementById('goalCategory').value;
  if (!name)             { showToast('Enter a goal name','error'); return; }
  if (!target||target<=0){ showToast('Enter a valid target amount','error'); return; }
  STATE.goals = STATE.goals||[];
  STATE.goals.push({ id:Date.now(), name, target, saved, monthly, targetDate:date, category:cat });
  save(); closeModal(); showToast(`Goal "${name}" added ✓`); renderGoals();
  ['goalName','goalTarget','goalSaved','goalMonthly'].forEach(id => document.getElementById(id).value='');
}

function deleteGoal(id) {
  STATE.goals = (STATE.goals||[]).filter(g => g.id !== id);
  save(); renderGoals(); showToast('Goal removed');
}

function openContribution(id) {
  document.getElementById('contribGoalId').value = id;
  document.getElementById('contribAmount').value = '';
  openModal('addContribution');
}

function saveContribution() {
  const id     = parseInt(document.getElementById('contribGoalId').value);
  const amount = parseFloat(document.getElementById('contribAmount').value);
  if (!amount||amount<=0) { showToast('Enter a valid amount','error'); return; }
  const goal = (STATE.goals||[]).find(g => g.id===id);
  if (!goal) return;
  goal.saved = (goal.saved||0) + amount;
  save(); closeModal(); showToast(`Added to "${goal.name}" ✓`); renderGoals();
}

/* ══════════════════════════════════════
   NET WORTH
   ══════════════════════════════════════ */
function saveAsset() {
  const name  = document.getElementById('assetName').value.trim();
  const value = parseFloat(document.getElementById('assetValue').value);
  const type  = document.getElementById('assetType').value;
  if (!name||!value) { showToast('Fill all fields','error'); return; }
  STATE.assets = STATE.assets||[];
  STATE.assets.push({ id:Date.now(), name, value, type });
  save(); closeModal(); showToast('Asset added ✓'); renderNetWorth();
  document.getElementById('assetName').value=''; document.getElementById('assetValue').value='';
}

function saveLiability() {
  const name  = document.getElementById('liabName').value.trim();
  const value = parseFloat(document.getElementById('liabValue').value);
  const type  = document.getElementById('liabType').value;
  if (!name||!value) { showToast('Fill all fields','error'); return; }
  STATE.liabilities = STATE.liabilities||[];
  STATE.liabilities.push({ id:Date.now(), name, value, type });
  save(); closeModal(); showToast('Liability added ✓'); renderNetWorth();
}

function deleteAsset(id) { STATE.assets=(STATE.assets||[]).filter(a=>a.id!==id); save(); renderNetWorth(); showToast('Removed'); }
function deleteLiability(id) { STATE.liabilities=(STATE.liabilities||[]).filter(l=>l.id!==id); save(); renderNetWorth(); showToast('Removed'); }

/* ══════════════════════════════════════
   HELPERS
   ══════════════════════════════════════ */
function fmt(n) { return '₹'+Math.abs(n).toLocaleString('en-IN',{maximumFractionDigits:0}); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDate(d) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function getMonthKey(d) { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`; }
function getMonthLabel(k) { const [y,m]=k.split('-'); return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]} ${y}`; }
function currentMonth() { return getMonthKey(new Date().toISOString()); }
function getDaysUntil(day) { const t=new Date(),d=new Date(t.getFullYear(),t.getMonth(),day); if(d<t)d.setMonth(d.getMonth()+1); return Math.ceil((d-t)/(86400000)); }
function monthsBetween(a,b) { return Math.max(0,(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth())); }
function getLast6Months() { const r=[],d=new Date(); for(let i=5;i>=0;i--){const dt=new Date(d.getFullYear(),d.getMonth()-i,1);r.push(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`);} return r; }

/* ══════════════════════════════════════
   RENDER — DASHBOARD
   ══════════════════════════════════════ */
const CHARTS = {};

function destroyAllCharts() {
  Object.values(CHARTS).forEach(c => { try { c.destroy(); } catch(e){} });
  Object.keys(CHARTS).forEach(k => delete CHARTS[k]);
}

function renderDashboard() {
  const cm = currentMonth();
  const thisMonth = STATE.transactions.filter(t => getMonthKey(t.date) === cm);
  const income  = thisMonth.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const spent   = thisMonth.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const savings = income - spent;
  const totalDebt = STATE.loans.reduce((s,l)=>s+l.balance,0);

  document.getElementById('kpi-income').textContent  = fmt(income);
  document.getElementById('kpi-spent').textContent   = fmt(spent);
  document.getElementById('kpi-savings').textContent = fmt(savings);
  document.getElementById('kpi-debt').textContent    = fmt(totalDebt);

  const spentPct   = income>0 ? Math.round((spent/income)*100) : 0;
  const savingsRate= income>0 ? Math.round((savings/income)*100) : 0;

  const spentEl = document.getElementById('kpi-spent-pct');
  spentEl.textContent  = `${spentPct}% of income`;
  spentEl.className    = 'kpi-delta '+(spentPct>80?'negative':'');

  const savEl = document.getElementById('kpi-savings-pct');
  savEl.textContent = `${Math.max(0,savingsRate)}% savings rate`;
  savEl.className   = 'kpi-delta '+(savingsRate>=20?'positive':'negative');

  // Health score
  const debtEMI    = STATE.loans.reduce((s,l)=>s+l.emi,0);
  const debtRatio  = income>0 ? Math.min(100,Math.round((debtEMI/income)*100)) : 0;
  const budgCtrl   = income>0 ? Math.max(0,100-spentPct) : 0;
  const score = Math.min(100,Math.max(0,
    (savingsRate>=30?30:savingsRate>=15?20:savingsRate>=0?10:0)+
    (spentPct<=60?25:spentPct<=75?18:spentPct<=90?10:5)+
    (income>0?20:0)+
    (totalDebt===0?25:totalDebt<income*3?18:10)
  ));

  document.getElementById('healthScoreNum').textContent = income>0 ? score : '—';
  const offset = income>0 ? 314-(314*score/100) : 314;
  const ring = document.getElementById('healthRing');
  ring.setAttribute('stroke-dashoffset', offset);
  ring.style.stroke = score>=70?'var(--accent)':score>=40?'var(--warning)':'var(--danger)';

  document.getElementById('hbar-savings').style.width = Math.min(100,Math.max(0,savingsRate))+'%';
  document.getElementById('hval-savings').textContent = income>0 ? Math.max(0,savingsRate)+'%' : '—';
  document.getElementById('hbar-debt').style.width    = debtRatio+'%';
  document.getElementById('hval-debt').textContent    = income>0 ? debtRatio+'%' : '—';
  document.getElementById('hbar-budget').style.width  = budgCtrl+'%';
  document.getElementById('hval-budget').textContent  = income>0 ? budgCtrl+'%' : '—';

  // Nudges
  const nudges = [
    savingsRate<10&&income>0 ? '⚠️ Your savings rate is below 10%. Review your discretionary spending.' : null,
    savingsRate>=20 ? '🎯 Great savings rate! You\'re saving over 20% this month.' : null,
    spentPct>90&&income>0 ? '🚨 You\'ve spent over 90% of income this month.' : null,
    debtRatio>40 ? '💳 EMIs are above 40% of income — high debt load.' : null,
    totalDebt===0&&income>0 ? '🏆 Debt-free! Consider directing surplus to investments.' : null,
    income===0 ? '👆 Add your income transaction to see your health score and insights.' : null,
    '💡 Track every rupee — awareness is the first step to financial freedom.'
  ].filter(Boolean);
  document.getElementById('nudgeText').textContent = nudges[0] || nudges[nudges.length-1];

  // Recent transactions
  const listEl = document.getElementById('recentTxnList');
  const recent = STATE.transactions.slice(0,8);
  listEl.innerHTML = recent.length
    ? recent.map(t => `
        <div class="txn-item">
          <div class="cat-icon" style="background:${t.type==='income'?'var(--accent-dim)':'var(--surface-2)'}">${CATEGORY_ICONS[t.category]||'📌'}</div>
          <div class="txn-meta">
            <div class="txn-desc">${escHtml(t.desc)}</div>
            <div class="txn-cat-date">${t.category} · ${formatDate(t.date)}</div>
          </div>
          <div class="txn-amount ${t.type}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</div>
        </div>`).join('')
    : '<div class="empty-state">No transactions yet. Add your first one!</div>';

  renderDashboardCharts();
  renderDashboardBudgets();
}

function renderDashboardCharts() {
  const isDark   = document.documentElement.getAttribute('data-theme')==='dark';
  const gridColor= isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)';
  const textColor= isDark?'rgba(240,240,255,0.5)':'rgba(15,15,26,0.5)';
  const months   = getLast6Months();
  const spendData= months.map(m=>STATE.transactions.filter(t=>t.type==='expense'&&getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0));
  const incData  = months.map(m=>STATE.transactions.filter(t=>t.type==='income'&&getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0));

  if(CHARTS.trend) CHARTS.trend.destroy();
  CHARTS.trend = new Chart(document.getElementById('spendingTrendChart'),{
    type:'line',
    data:{ labels:months.map(getMonthLabel), datasets:[
      {label:'Expenses',data:spendData,borderColor:'#f87171',backgroundColor:'rgba(248,113,113,0.08)',tension:0.4,fill:true,pointBackgroundColor:'#f87171',pointRadius:4},
      {label:'Income',  data:incData,  borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,0.08)',tension:0.4,fill:true,pointBackgroundColor:'#6ee7b7',pointRadius:4}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:gridColor},ticks:{color:textColor,font:{size:11}}},y:{grid:{color:gridColor},ticks:{color:textColor,font:{size:11},callback:v=>'₹'+(v>=1000?Math.round(v/1000)+'k':v)}}}}
  });

  const cm=currentMonth();
  const catMap={};
  STATE.transactions.filter(t=>t.type==='expense'&&getMonthKey(t.date)===cm).forEach(t=>{catMap[t.category]=(catMap[t.category]||0)+t.amount;});
  const cats=Object.keys(catMap), vals=cats.map(k=>catMap[k]);
  const total=vals.reduce((s,v)=>s+v,0);

  if(CHARTS.donut) CHARTS.donut.destroy();
  if(cats.length){
    CHARTS.donut=new Chart(document.getElementById('categoryDonut'),{
      type:'doughnut',
      data:{labels:cats,datasets:[{data:vals,backgroundColor:CATEGORY_COLORS.slice(0,cats.length),borderWidth:0,hoverOffset:4}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false}}}
    });
    document.getElementById('donutLegend').innerHTML=cats.map((k,i)=>`
      <div class="legend-item"><div class="legend-dot" style="background:${CATEGORY_COLORS[i%CATEGORY_COLORS.length]}"></div>
      <span class="legend-name">${k}</span><span class="legend-val">${total>0?Math.round((vals[i]/total)*100):0}%</span></div>`).join('');
  } else {
    document.getElementById('donutLegend').innerHTML='<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:8px">No expenses this month</div>';
  }
}

function renderDashboardBudgets() {
  const budgets=(STATE.budgets||[]);
  const wrap=document.getElementById('dashBudgetWrap');
  const strip=document.getElementById('budgetAlertStrip');
  if(!budgets.length){wrap.style.display='none';strip.style.display='none';return;}
  wrap.style.display='block';
  const cm=currentMonth(); const alerts=[];
  const rows=budgets.map(b=>{
    const spent=STATE.transactions.filter(t=>t.type==='expense'&&t.category===b.category&&getMonthKey(t.date)===cm).reduce((s,t)=>s+t.amount,0);
    const pct=b.amount>0?(spent/b.amount)*100:0;
    const sc=pct>=100?'danger':pct>=b.alertPct?'warning':'safe';
    if(pct>=b.alertPct) alerts.push({category:b.category,pct:Math.round(pct),over:pct>=100});
    return `<div class="budget-mini-row"><span class="budget-mini-label">${CATEGORY_ICONS[b.category]||'📌'} ${b.category}</span><div class="budget-bar-wrap" style="height:6px"><div class="budget-bar-fill ${sc}" style="width:${Math.min(pct,100)}%;height:100%"></div></div><span class="budget-mini-val" style="color:${pct>=100?'var(--danger)':pct>=b.alertPct?'var(--warning)':'var(--text-muted)'}">${fmt(spent)}/${fmt(b.amount)}</span></div>`;
  });
  document.getElementById('dashBudgetGrid').innerHTML=rows.join('');
  if(alerts.length){
    strip.style.display='flex'; strip.style.flexDirection='column'; strip.style.gap='6px';
    strip.innerHTML=alerts.map(a=>`<div class="budget-alert ${a.over?'danger-alert':''}">${a.over?'🚨':'⚠️'} <span><strong>${a.category}</strong> at ${a.pct}%${a.over?' — over limit!':' — nearing limit.'}</span></div>`).join('');
  } else { strip.style.display='none'; }
}

/* ── TRANSACTIONS PAGE ── */
function renderTransactionPage() {
  populateTxnFilters();
  const search=(document.getElementById('txnSearch')?.value||'').toLowerCase();
  const cat   =document.getElementById('txnCatFilter')?.value||'';
  const type  =document.getElementById('txnTypeFilter')?.value||'';
  const month =document.getElementById('txnMonthFilter')?.value||'';
  let txns=STATE.transactions;
  if(search) txns=txns.filter(t=>t.desc.toLowerCase().includes(search)||t.category.toLowerCase().includes(search));
  if(cat)    txns=txns.filter(t=>t.category===cat);
  if(type)   txns=txns.filter(t=>t.type===type);
  if(month)  txns=txns.filter(t=>getMonthKey(t.date)===month);
  const tbody=document.getElementById('txnTableBody');
  const empty=document.getElementById('txnEmpty');
  if(!txns.length){ tbody.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  tbody.innerHTML=txns.map(t=>`
    <tr>
      <td style="color:var(--text-secondary)">${formatDate(t.date)}</td>
      <td><div style="font-weight:500">${escHtml(t.desc)}</div>${t.notes?`<div style="font-size:11px;color:var(--text-muted)">${escHtml(t.notes)}</div>`:''}</td>
      <td><span style="font-size:12.5px;color:var(--text-secondary)">${CATEGORY_ICONS[t.category]||'📌'} ${t.category}</span></td>
      <td><span class="type-badge ${t.type}">${t.type}</span></td>
      <td class="txn-amount ${t.type}" style="font-size:14px;font-weight:600;font-family:var(--font-display)">${t.type==='income'?'+':'-'}${fmt(t.amount)}</td>
      <td><button class="delete-btn" onclick="deleteTxn(${t.id})">✕</button></td>
    </tr>`).join('');
}

function populateTxnFilters() {
  const cats=[...new Set(STATE.transactions.map(t=>t.category))].sort();
  const catSel=document.getElementById('txnCatFilter');
  if(catSel){ const cur=catSel.value; catSel.innerHTML='<option value="">All Categories</option>'+cats.map(c=>`<option value="${c}">${c}</option>`).join(''); catSel.value=cur; }
  const months=[...new Set(STATE.transactions.map(t=>getMonthKey(t.date)))].sort().reverse();
  const mSel=document.getElementById('txnMonthFilter');
  if(mSel){ const cur=mSel.value; mSel.innerHTML='<option value="">All Months</option>'+months.map(m=>`<option value="${m}">${getMonthLabel(m)}</option>`).join(''); mSel.value=cur; }
}

/* ── ANALYTICS ── */
function renderAnalytics() {
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const gc=isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)';
  const tc=isDark?'rgba(240,240,255,0.5)':'rgba(15,15,26,0.5)';
  const months=getLast6Months();
  const incD=months.map(m=>STATE.transactions.filter(t=>t.type==='income'&&getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0));
  const expD=months.map(m=>STATE.transactions.filter(t=>t.type==='expense'&&getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0));
  if(CHARTS.ie)CHARTS.ie.destroy();
  CHARTS.ie=new Chart(document.getElementById('incomeExpenseChart'),{type:'bar',data:{labels:months.map(getMonthLabel),datasets:[{label:'Income',data:incD,backgroundColor:'rgba(110,231,183,0.7)',borderRadius:6},{label:'Expenses',data:expD,backgroundColor:'rgba(248,113,113,0.7)',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:gc},ticks:{color:tc,font:{size:11}}},y:{grid:{color:gc},ticks:{color:tc,font:{size:11},callback:v=>'₹'+(v>=1000?Math.round(v/1000)+'k':v)}}}}});
  const catMap={};
  STATE.transactions.filter(t=>t.type==='expense').forEach(t=>{catMap[t.category]=(catMap[t.category]||0)+t.amount;});
  const sorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(CHARTS.cat)CHARTS.cat.destroy();
  CHARTS.cat=new Chart(document.getElementById('categoryBarChart'),{type:'bar',data:{labels:sorted.map(([k])=>k),datasets:[{data:sorted.map(([,v])=>v),backgroundColor:CATEGORY_COLORS.slice(0,sorted.length),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:gc},ticks:{color:tc,font:{size:11},callback:v=>'₹'+(v>=1000?Math.round(v/1000)+'k':v)}},y:{grid:{display:false},ticks:{color:tc,font:{size:11}}}}}});
  const rates=months.map(m=>{const inc=STATE.transactions.filter(t=>t.type==='income'&&getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0);const exp=STATE.transactions.filter(t=>t.type==='expense'&&getMonthKey(t.date)===m).reduce((s,t)=>s+t.amount,0);return inc>0?Math.round(((inc-exp)/inc)*100):0;});
  if(CHARTS.sav)CHARTS.sav.destroy();
  CHARTS.sav=new Chart(document.getElementById('savingsRateChart'),{type:'line',data:{labels:months.map(getMonthLabel),datasets:[{label:'Savings %',data:rates,borderColor:'#60a5fa',backgroundColor:'rgba(96,165,250,0.1)',tension:0.4,fill:true,pointBackgroundColor:'#60a5fa',pointRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:gc},ticks:{color:tc,font:{size:11}}},y:{grid:{color:gc},ticks:{color:tc,font:{size:11},callback:v=>v+'%'},min:0,max:100}}}});
  renderHeatmap();
}

function renderHeatmap() {
  const container=document.getElementById('heatmapContainer');
  const today=new Date(); const days=28;
  const dayData=[];
  for(let i=days-1;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const k=d.toISOString().split('T')[0];const s=STATE.transactions.filter(t=>t.date===k&&t.type==='expense').reduce((s,t)=>s+t.amount,0);dayData.push({date:k,spent:s});}
  const max=Math.max(...dayData.map(d=>d.spent),1);
  container.innerHTML=`<div style="display:flex;gap:4px;margin-bottom:6px;padding:0 8px;">${['M','T','W','T','F','S','S'].map(l=>`<div style="flex:1;text-align:center;font-size:10px;color:var(--text-muted)">${l}</div>`).join('')}</div><div class="heatmap-grid">${dayData.map(d=>{const p=d.spent/max;const lv=p===0?0:p<0.25?1:p<0.5?2:p<0.75?3:4;return`<div class="heatmap-day lvl-${lv}" title="${d.date}: ${fmt(d.spent)}"></div>`;}).join('')}</div><div style="display:flex;align-items:center;gap:6px;padding:8px;font-size:10px;color:var(--text-muted)">Less ${[0,1,2,3,4].map(l=>`<div class="heatmap-day lvl-${l}" style="width:12px;height:12px;flex-shrink:0"></div>`).join('')} More</div>`;
}

/* ── BUDGET PAGE ── */
function renderBudget() {
  const budgets=STATE.budgets||[];
  const cm=currentMonth();
  let totalBudgeted=0,totalSpent=0,overCount=0;
  const enriched=budgets.map(b=>{
    const spent=STATE.transactions.filter(t=>t.type==='expense'&&t.category===b.category&&getMonthKey(t.date)===cm).reduce((s,t)=>s+t.amount,0);
    const pct=b.amount>0?(spent/b.amount)*100:0;
    totalBudgeted+=b.amount; totalSpent+=Math.min(spent,b.amount*1.5);
    if(spent>b.amount) overCount++;
    return {...b,spent,pct};
  });
  document.getElementById('bud-total').textContent=fmt(totalBudgeted);
  document.getElementById('bud-spent').textContent=fmt(totalSpent);
  document.getElementById('bud-remaining').textContent=fmt(Math.max(0,totalBudgeted-totalSpent));
  document.getElementById('bud-over').textContent=overCount;
  const grid=document.getElementById('budgetPageGrid');
  if(!budgets.length){grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">No budgets set. Click "+ Set Budget" to start.</div>';return;}
  grid.innerHTML=enriched.map(b=>{
    const pc=Math.min(b.pct,100); const sc=b.pct>=100?'danger':b.pct>=b.alertPct?'warning':'safe';
    const cc=b.pct>=100?'over-budget':b.pct>=b.alertPct?'near-budget':'';
    const rem=b.amount-b.spent;
    const statusLabel=b.pct>=100?`<span style="color:var(--danger);font-weight:600">Over by ${fmt(b.spent-b.amount)}</span>`:`${fmt(Math.max(0,rem))} left`;
    return `<div class="budget-card ${cc}"><div class="budget-card-header"><div class="budget-cat-wrap"><div class="cat-icon" style="background:var(--surface-2)">${CATEGORY_ICONS[b.category]||'📌'}</div><span class="budget-cat-name">${b.category}</span></div><div class="budget-amounts"><div class="budget-spent-val">${fmt(b.spent)}</div><div class="budget-limit-val">of ${fmt(b.amount)}</div></div></div><div class="budget-bar-wrap"><div class="budget-bar-fill ${sc}" style="width:${pc}%"></div></div><div class="budget-bar-meta"><span>${statusLabel}</span><span class="pct ${sc}">${Math.round(b.pct)}%</span></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--border)"><span style="font-size:11px;color:var(--text-muted)">Alert at ${b.alertPct}%</span><button class="delete-btn" onclick="deleteBudget(${b.id})">Remove</button></div></div>`;
  }).join('');
}

/* ── GOALS PAGE ── */
function renderGoals() {
  const goals=STATE.goals||[];
  const tt=goals.reduce((s,g)=>s+g.target,0);
  const ts=goals.reduce((s,g)=>s+(g.saved||0),0);
  const on=goals.filter(g=>{if(!g.targetDate)return true;const r=g.target-(g.saved||0);const m=monthsBetween(new Date(),new Date(g.targetDate));return r<=0||(m>0&&(r/m)<=(g.monthly||Infinity));}).length;
  const avg=goals.length?Math.round(goals.reduce((s,g)=>s+Math.min(100,((g.saved||0)/g.target)*100),0)/goals.length):0;
  document.getElementById('goal-total').textContent=fmt(tt);
  document.getElementById('goal-saved').textContent=fmt(ts);
  document.getElementById('goal-ontrack').textContent=on;
  document.getElementById('goal-avg').textContent=avg+'%';
  const grid=document.getElementById('goalsGrid');
  if(!goals.length){grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">No goals yet. Set your first savings target!</div>';return;}
  grid.innerHTML=goals.map(g=>{
    const saved=g.saved||0; const pct=Math.min(100,Math.round((saved/g.target)*100));
    const rem=Math.max(0,g.target-saved); const done=saved>=g.target;
    const months=g.targetDate?monthsBetween(new Date(),new Date(g.targetDate)):null;
    const needed=months&&months>0?Math.ceil(rem/months):null;
    const onTrack=!needed||needed<=(g.monthly||0)||done;
    const fc=done?'complete':pct>=75?'near':''; const pc2=done?'complete':pct>=75?'near':'';
    return `<div class="goal-card ${done?'completed':''}">
      <div class="goal-header"><div class="goal-icon-wrap"><span class="goal-emoji">${GOAL_EMOJIS[g.category]||'🎯'}</span><div><div class="goal-name">${escHtml(g.name)}</div><div class="goal-cat">${g.category}</div></div></div>
      <div class="goal-actions">${!done?`<button class="btn-outline" style="padding:5px 11px;font-size:11px" onclick="openContribution(${g.id})">+ Add</button>`:''}<button class="delete-btn" onclick="deleteGoal(${g.id})">✕</button></div></div>
      <div class="goal-amounts"><span class="goal-saved-amount">${fmt(saved)}</span><span class="goal-target-amount">of ${fmt(g.target)}</span></div>
      <div class="goal-progress-wrap"><div class="goal-progress-fill ${fc}" style="width:${pct}%"></div></div>
      <div class="goal-meta-row"><span class="goal-pct ${pc2}">${pct}% complete</span><span class="goal-months-left">${months!==null?(done?'🎉 Reached!':Math.max(0,months)+'mo left'):''}</span></div>
      ${done?`<div class="goal-complete-badge">🏆 Goal Achieved!</div>`:`
      <div class="goal-divider"></div>
      <div class="goal-stats">
        <div class="goal-stat"><span class="goal-stat-label">Still Needed</span><span class="goal-stat-value">${fmt(rem)}</span></div>
        <div class="goal-stat"><span class="goal-stat-label">Monthly Plan</span><span class="goal-stat-value">${g.monthly?fmt(g.monthly):'—'}</span></div>
        <div class="goal-stat"><span class="goal-stat-label">Needed/Month</span><span class="goal-stat-value" style="color:${needed&&needed>(g.monthly||0)?'var(--warning)':'var(--accent)'}">${needed?fmt(needed):'—'}</span></div>
        <div class="goal-stat"><span class="goal-stat-label">On Track</span><span class="goal-stat-value" style="color:${onTrack?'var(--accent)':'var(--warning)'}">${onTrack?'✓ Yes':'⚠ Adjust'}</span></div>
      </div>`}
    </div>`;
  }).join('');
}

/* ── LOANS PAGE ── */
function renderLoans() {
  const td=STATE.loans.reduce((s,l)=>s+l.balance,0);
  const te=STATE.loans.reduce((s,l)=>s+l.emi,0);
  const ar=STATE.loans.length>0?(STATE.loans.reduce((s,l)=>s+(l.rate||0),0)/STATE.loans.length).toFixed(1):0;
  const cm=currentMonth(); const mi=STATE.transactions.filter(t=>t.type==='income'&&getMonthKey(t.date)===cm).reduce((s,t)=>s+t.amount,0);
  const dti=mi>0?Math.round((te/mi)*100):0;
  document.getElementById('loan-total').textContent=fmt(td);
  document.getElementById('loan-emi').textContent=fmt(te);
  document.getElementById('loan-rate').textContent=ar+'%';
  document.getElementById('loan-dti').textContent=dti+'%';
  const cont=document.getElementById('loansList');
  if(!STATE.loans.length){cont.innerHTML='<div class="empty-state">No loans added yet.</div>';return;}
  cont.innerHTML=STATE.loans.map(l=>{
    const paid=l.principal-l.balance; const pct=l.principal>0?Math.min(100,Math.round((paid/l.principal)*100)):0;
    const days=getDaysUntil(l.dueDay);
    return `<div class="loan-card"><div class="loan-header"><div class="loan-name-wrap"><span class="loan-badge">${l.type}</span><span class="loan-name-text">${escHtml(l.name)}</span></div><div style="display:flex;align-items:center;gap:10px"><div class="loan-amount">${fmt(l.balance)}</div><button class="delete-btn" onclick="deleteLoan(${l.id})">✕</button></div></div>
    <div class="loan-meta"><div class="loan-meta-item"><span class="loan-meta-label">Monthly EMI</span><span class="loan-meta-value">${fmt(l.emi)}</span></div><div class="loan-meta-item"><span class="loan-meta-label">Interest Rate</span><span class="loan-meta-value">${l.rate||0}% p.a.</span></div><div class="loan-meta-item"><span class="loan-meta-label">Principal</span><span class="loan-meta-value">${fmt(l.principal)}</span></div><div class="loan-meta-item"><span class="loan-meta-label">Due Date</span><span class="loan-meta-value" style="color:${days<=5?'var(--danger)':'var(--text-primary)'}">${days<=5?'⚠️ ':''}${days}d away (${l.dueDay}th)</span></div></div>
    <div><div class="progress-label" style="margin-bottom:4px"><span>Repaid: ${fmt(paid)}</span><span>${pct}% paid</span></div><div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div></div></div>`;
  }).join('');
}

/* ── RECURRING PAGE ── */
function renderRecurring() {
  const monthly=STATE.recurring.reduce((s,r)=>s+(r.frequency==='yearly'?r.amount/12:r.frequency==='weekly'?r.amount*4:r.frequency==='quarterly'?r.amount/3:r.amount),0);
  const annual =STATE.recurring.reduce((s,r)=>s+(r.frequency==='yearly'?r.amount:r.frequency==='weekly'?r.amount*52:r.frequency==='quarterly'?r.amount*4:r.amount*12),0);
  const due    =STATE.recurring.filter(r=>getDaysUntil(r.dueDay)<=7).length;
  document.getElementById('rec-monthly').textContent=fmt(monthly);
  document.getElementById('rec-annual').textContent=fmt(annual);
  document.getElementById('rec-count').textContent=STATE.recurring.length;
  document.getElementById('rec-due').textContent=due;
  const cont=document.getElementById('recurringGrid');
  if(!STATE.recurring.length){cont.innerHTML='<div class="empty-state" style="grid-column:1/-1">No recurring payments added yet.</div>';return;}
  const fl={monthly:'Monthly',yearly:'Yearly',weekly:'Weekly',quarterly:'Quarterly'};
  cont.innerHTML=STATE.recurring.map(r=>{const days=getDaysUntil(r.dueDay);const urg=days<=3;return`<div class="rec-card" style="${urg?'border-color:rgba(251,191,36,0.4)':''}"><div class="rec-top"><span class="rec-name">${escHtml(r.name)}</span><span class="rec-freq">${fl[r.frequency]||r.frequency}</span></div><div class="rec-amount">${fmt(r.amount)}</div><div class="rec-meta"><span class="rec-cat">${r.category}</span><span class="rec-due" style="${urg?'color:var(--danger)':''}">${urg?'⚠️ ':''}Due in ${days}d</span></div><div style="text-align:right"><button class="delete-btn" onclick="deleteRecurring(${r.id})">Remove</button></div></div>`;}).join('');
}

/* ── NET WORTH PAGE ── */
function renderNetWorth() {
  const assets=(STATE.assets||[]);
  const loanLiabs=STATE.loans.map(l=>({id:'loan_'+l.id,name:l.name,value:l.balance,type:l.type,fromLoans:true}));
  const allLiabs=[...loanLiabs,...(STATE.liabilities||[])];
  const ta=assets.reduce((s,a)=>s+a.value,0);
  const tl=allLiabs.reduce((s,l)=>s+l.value,0);
  const nw=ta-tl;
  const hero=document.getElementById('nwHeroValue');
  hero.textContent=(nw<0?'-':'')+fmt(Math.abs(nw));
  hero.className='nw-hero-value '+(nw>0?'positive':nw<0?'negative':'');
  document.getElementById('nwTotalAssets').textContent=fmt(ta);
  document.getElementById('nwTotalLiabilities').textContent=fmt(tl);
  document.getElementById('nwHeroSub').textContent=ta===0&&tl===0?'Add assets and liabilities to see your position':`${fmt(ta)} assets − ${fmt(tl)} liabilities`;
  document.getElementById('nwAssetList').innerHTML=assets.length?assets.map(a=>`<div class="nw-item"><div class="nw-item-left"><div class="nw-item-icon">${ASSET_ICONS[a.type]||'💼'}</div><div><div class="nw-item-name">${escHtml(a.name)}</div><div class="nw-item-type">${a.type}</div></div></div><div style="display:flex;align-items:center;gap:10px"><span class="nw-item-value asset">${fmt(a.value)}</span><button class="delete-btn" onclick="deleteAsset(${a.id})">✕</button></div></div>`).join(''):'<div class="empty-state">No assets added yet.</div>';
  document.getElementById('nwLiabilityList').innerHTML=allLiabs.length?allLiabs.map(l=>`<div class="nw-item"><div class="nw-item-left"><div class="nw-item-icon">💳</div><div><div class="nw-item-name">${escHtml(l.name)}</div><div class="nw-item-type">${l.type}${l.fromLoans?` <span style="font-size:10px;color:var(--text-muted)">(from Loans)</span>`:''}</div></div></div><div style="display:flex;align-items:center;gap:10px"><span class="nw-item-value liability">−${fmt(l.value)}</span>${!l.fromLoans?`<button class="delete-btn" onclick="deleteLiability(${l.id})">✕</button>`:''}</div></div>`).join(''):'<div class="empty-state">No liabilities. Loans auto-appear here.</div>';
  if(!assets.length)return;
  const typeMap={};
  assets.forEach(a=>{typeMap[a.type]=(typeMap[a.type]||0)+a.value;});
  const types=Object.keys(typeMap),vals=types.map(t=>typeMap[t]);
  const colors=['#6ee7b7','#60a5fa','#fbbf24','#f87171','#a78bfa','#34d399','#fb923c','#38bdf8','#e879f9'];
  if(CHARTS.nw)CHARTS.nw.destroy();
  CHARTS.nw=new Chart(document.getElementById('nwDonut'),{type:'doughnut',data:{labels:types,datasets:[{data:vals,backgroundColor:colors.slice(0,types.length),borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:false}}}});
  document.getElementById('nwAllocLegend').innerHTML=types.map((t,i)=>`<div class="nw-legend-item"><div class="nw-legend-dot" style="background:${colors[i%colors.length]}"></div><span class="nw-legend-name">${t}</span><span class="nw-legend-val">${fmt(vals[i])}</span><span class="nw-legend-pct">${ta>0?Math.round((vals[i]/ta)*100):0}%</span></div>`).join('');
}

/* ── INSIGHTS ── */
function renderInsights() {
  const cm=currentMonth();
  const tm=STATE.transactions.filter(t=>getMonthKey(t.date)===cm);
  const income=tm.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const spent=tm.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const sr=income>0?Math.round(((income-spent)/income)*100):0;
  const td=STATE.loans.reduce((s,l)=>s+l.balance,0);
  const catMap={};tm.filter(t=>t.type==='expense').forEach(t=>{catMap[t.category]=(catMap[t.category]||0)+t.amount;});
  const topCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
  const recMonthly=(STATE.recurring||[]).reduce((s,r)=>s+(r.frequency==='yearly'?r.amount/12:r.frequency==='weekly'?r.amount*4:r.frequency==='quarterly'?r.amount/3:r.amount),0);
  const insights=[
    {icon:'📊',title:'Savings Rate Analysis',body:income>0?`You saved ${Math.max(0,sr)}% of your income this month. ${sr>=30?'Excellent — well above the 20% threshold.':sr>=20?'Good! Aim for 30%+ for faster wealth building.':'Try to reduce discretionary spending to reach 20%.'}`:' Add income transactions to see your savings rate.',badge:sr>=20?{text:'✓ On Track',cls:'badge-positive'}:{text:'↑ Needs Improvement',cls:'badge-warning'}},
    {icon:'🍽️',title:'Top Spending Category',body:topCat?`Biggest expense: ${topCat[0]} at ${fmt(topCat[1])} (${income>0?Math.round((topCat[1]/income)*100):0}% of income). ${topCat[0]==='Food'?'Meal prepping can cut dining costs significantly.':topCat[0]==='Shopping'?'Try the 24-hour rule before impulse purchases.':'Review if this fits your budget plan.'}`:' No expense data this month yet.',badge:topCat&&income>0&&topCat[1]/income>0.3?{text:'⚠ High Spend',cls:'badge-danger'}:{text:'✓ Normal',cls:'badge-positive'}},
    {icon:'💳',title:'Debt Health',body:td>0?`Total outstanding: ${fmt(td)} across ${STATE.loans.length} loan${STATE.loans.length>1?'s':''}. Monthly EMI: ${fmt(STATE.loans.reduce((s,l)=>s+l.emi,0))}. ${income>0&&STATE.loans.reduce((s,l)=>s+l.emi,0)/income>0.4?'Debt-to-income is high. Consider prepaying high-interest loans first.':'Debt load appears manageable.'}`:' No loans tracked. Add your loans for debt health insights.',badge:td===0?{text:'🏆 Debt Free',cls:'badge-positive'}:{text:'Track Actively',cls:'badge-info'}},
    {icon:'🔄',title:'Subscription Fatigue',body:recMonthly>0?`${STATE.recurring.length} recurring payments totalling ${fmt(recMonthly)}/month (₹${Math.round(recMonthly*12/1000)}k/year). ${recMonthly>5000?'Audit your subscriptions — small amounts compound significantly.':'Subscription load looks healthy.'}`:' No recurring payments tracked. Add subscriptions, SIPs, and bills to stay on top of them.',badge:recMonthly>5000?{text:'Audit Suggested',cls:'badge-warning'}:{text:'✓ Healthy',cls:'badge-positive'}},
    {icon:'💡',title:'50/30/20 Rule Check',body:'The 50/30/20 framework: 50% needs (rent, groceries, EMIs), 30% wants (dining, entertainment, shopping), 20% savings & investments. Small, consistent choices outperform occasional windfalls.',badge:{text:'Behavioural Finance',cls:'badge-info'}},
    {icon:'📅',title:'Due Date Watch',body:STATE.recurring.filter(r=>getDaysUntil(r.dueDay)<=7).length>0?`${STATE.recurring.filter(r=>getDaysUntil(r.dueDay)<=7).length} payment(s) due in 7 days: ${STATE.recurring.filter(r=>getDaysUntil(r.dueDay)<=7).map(r=>r.name).join(', ')}. Ensure sufficient balance.`:'No payments due in the next 7 days.',badge:STATE.recurring.filter(r=>getDaysUntil(r.dueDay)<=3).length>0?{text:'⚠ Due Soon',cls:'badge-danger'}:{text:'✓ Clear',cls:'badge-positive'}}
  ];
  document.getElementById('insightsGrid').innerHTML=insights.map(ins=>`<div class="insight-card"><div class="insight-icon">${ins.icon}</div><div class="insight-title">${ins.title}</div><div class="insight-body">${ins.body}</div><span class="insight-badge ${ins.badge.cls}">${ins.badge.text}</span></div>`).join('');
}

/* ── LEDGER ── */
function renderLedger() {
  const cont=document.getElementById('ledgerContent');
  if(!STATE.transactions.length){cont.innerHTML='<div class="empty-state">No transaction history yet.</div>';return;}
  const byMonth={};STATE.transactions.forEach(t=>{const m=getMonthKey(t.date);if(!byMonth[m])byMonth[m]=[];byMonth[m].push(t);});
  cont.innerHTML=Object.keys(byMonth).sort().reverse().map(m=>{
    const txns=byMonth[m];const inc=txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);const exp=txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    return `<div class="ledger-month"><div class="ledger-month-header"><span class="ledger-month-title">${getMonthLabel(m)}</span><div class="ledger-month-summary"><span class="ledger-month-income">+${fmt(inc)}</span><span class="ledger-month-expense">-${fmt(exp)}</span><span style="color:${inc-exp>=0?'var(--accent)':'var(--danger)'};font-weight:600;font-size:12px">Net: ${fmt(inc-exp)}</span></div></div><div class="ledger-month-table"><table class="txn-table"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Mode</th><th>Amount</th></tr></thead><tbody>${txns.map(t=>`<tr><td style="color:var(--text-secondary)">${formatDate(t.date)}</td><td>${escHtml(t.desc)}</td><td style="color:var(--text-secondary)">${CATEGORY_ICONS[t.category]||'📌'} ${t.category}</td><td style="color:var(--text-muted);font-size:12px">${t.mode}</td><td class="txn-amount ${t.type}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }).join('');
}

/* ── EXPORT ── */
function exportCSV() {
  const rows=[['Date','Description','Category','Type','Amount','Mode','Notes']];
  STATE.transactions.forEach(t=>rows.push([t.date,t.desc,t.category,t.type,t.amount,t.mode,t.notes||'']));
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`finio-transactions-${new Date().toISOString().split('T')[0]}.csv`;a.click();
  showToast('CSV exported ✓');
}

/* ── TOAST ── */
function showToast(msg,type='success') {
  const t=document.getElementById('toast');t.textContent=msg;
  t.style.borderLeftColor=type==='error'?'var(--danger)':'var(--accent)';
  t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2800);
}

/* ══════════════════════════════════════
   INIT
   ══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  const theme = localStorage.getItem('finio_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);

  // Check for existing session
  const session = localStorage.getItem('finio_session');
  if (session) {
    try {
      const user = JSON.parse(session);
      loadUserData(user.email);
      CURRENT_USER = user;
      IS_DEMO = false;
      bootApp();
    } catch(e) {
      localStorage.removeItem('finio_session');
    }
  }

  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); navigate(item.getAttribute('data-page')); });
  });

  // Theme toggles
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('themeToggleMobile').addEventListener('click', toggleTheme);

  // Hamburger
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Chart tabs
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderDashboardCharts();
    });
  });

  // Enter key on auth forms
  ['loginPassword'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if(e.key==='Enter') handleLogin(); });
  });
  ['regPassword'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if(e.key==='Enter') handleRegister(); });
  });
});
