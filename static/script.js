// ===== ICONE VETTORIALI (stile SF Symbols / Lucide) =====
const ICONS = {
    "refresh": "<path d=\"M3 12a9 9 0 0 1 15-6.7L21 8\"/><path d=\"M21 3v5h-5\"/><path d=\"M21 12a9 9 0 0 1-15 6.7L3 16\"/><path d=\"M3 21v-5h5\"/>",
    "download": "<path d=\"M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"/><path d=\"M14 3v6h6\"/><path d=\"M12 12v6\"/><path d=\"m9 15 3 3 3-3\"/>",
    "file": "<path d=\"M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"/><path d=\"M14 3v6h6\"/><path d=\"M8 13h8M8 17h5\"/>",
    "sparkles": "<path d=\"M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z\"/><path d=\"M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z\"/>",
    "calendar": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 10h18\"/>",
    "hint": "<path d=\"M9 18h6M10 21h4\"/><path d=\"M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z\"/>",
    "building": "<path d=\"M6 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v17\"/><path d=\"M15 9h3a1 1 0 0 1 1 1v11\"/><path d=\"M3 21h18\"/><path d=\"M9 7h2M9 11h2M9 15h2\"/>",
    "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.9\"/><path d=\"M16 3.1a4 4 0 0 1 0 7.8\"/>",
    "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/>",
    "mail": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m3 7 9 6 9-6\"/>",
    "shuffle": "<path d=\"M16 3h5v5\"/><path d=\"M4 20 21 3\"/><path d=\"M21 16v5h-5\"/><path d=\"M15 15l6 6\"/><path d=\"M4 4l5 5\"/>",
    "trend": "<path d=\"M3 17l6-6 4 4 8-8\"/><path d=\"M14 7h7v7\"/>",
    "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>",
    "alert": "<path d=\"M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/>",
    "error": "<path d=\"M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z\"/><path d=\"m15 9-6 6M9 9l6 6\"/>",
    "bot": "<rect x=\"4\" y=\"8\" width=\"16\" height=\"12\" rx=\"3\"/><path d=\"M12 4v4M9 13h.01M15 13h.01M8 4h8\"/>",
    "copy": "<rect x=\"8\" y=\"3\" width=\"8\" height=\"4\" rx=\"1\"/><path d=\"M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2\"/>",
    "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4\"/>",
    "moon": "<path d=\"M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z\"/>",
    "note": "<path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z\"/>",
    "check": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m8 12 3 3 5-6\"/>"
};

function icon(name, extraClass = '') {
    const body = ICONS[name];
    if (!body) return '';
    return `<svg class="ico ${extraClass}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

// Sostituisce i segnaposto <span data-icon="..."> presenti nell'HTML
function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]:not([data-icon-done])').forEach(el => {
        el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
        el.setAttribute('data-icon-done', '1');
    });
}

function dot(kind) {
    return `<i class="dot dot-${kind}"></i>`;
}

let currentData = [];
let currentPresenceSummary = null;
let currentActiveTile = 'tile-presence';
let currentRules = [];
let editingId = null;
let chartTeam = null;
let selectedTeamMember = 'ALL';
let teamMembersList = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    hydrateIcons();
    initTheme();
    initParticles();
    initIPs();
});

// --- THEME ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeButton();
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton();
    positionTabThumb();
}

function updateThemeButton() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const btn = document.getElementById('theme-btn');
    if (btn) {
        btn.innerHTML = isDark ? `${icon('sun')} Light` : `${icon('moon')} Dark`;
    }
}

// --- PARTICLES ---
function initParticles() {
    tsParticles.load("tsparticles", {
        fpsLimit: 60,
        particles: {
            color: { value: "#A61D33" },
            links: {
                color: "#A61D33",
                distance: 150,
                enable: true,
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 1,
                direction: "none",
                random: false,
                straight: false,
                outModes: { default: "bounce" }
            },
            number: {
                density: { enable: true, area: 800 },
                value: 60
            },
            opacity: { value: 0.5 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 3 } }
        },
        detectRetina: true
    });
}

// --- IP MANAGEMENT ---
function initIPs() {
    let savedIPs = JSON.parse(localStorage.getItem('savedIPs'));
    if (!savedIPs || savedIPs.length === 0) {
        // Fallback default
        savedIPs = ['192.168.1.245'];
        localStorage.setItem('savedIPs', JSON.stringify(savedIPs));
    }

    const select = document.getElementById('ip-select');
    select.innerHTML = '';
    
    savedIPs.forEach(ip => {
        const opt = document.createElement('option');
        opt.value = ip;
        opt.textContent = ip;
        select.appendChild(opt);
    });

    const optNew = document.createElement('option');
    optNew.value = 'new';
    optNew.textContent = '+ Aggiungi nuovo IP...';
    select.appendChild(optNew);

    // Set last used IP as default
    const lastUsedIP = localStorage.getItem('lastUsedIP');
    if (lastUsedIP && savedIPs.includes(lastUsedIP)) {
        select.value = lastUsedIP;
    } else {
        select.value = savedIPs[savedIPs.length - 1];
    }
}

function handleIPSelection() {
    const select = document.getElementById('ip-select');
    const input = document.getElementById('new-ip-input');
    if (select.value === 'new') {
        input.style.display = 'block';
        input.focus();
    } else {
        input.style.display = 'none';
        input.value = '';
    }
}

function getOllamaIP() {
    const select = document.getElementById('ip-select');
    const input = document.getElementById('new-ip-input');
    
    let resultIP = '';
    if (select.value === 'new') {
        const newIP = input.value.trim();
        if (newIP) {
            // Save new IP
            let savedIPs = JSON.parse(localStorage.getItem('savedIPs')) || [];
            if (!savedIPs.includes(newIP)) {
                savedIPs.push(newIP);
                localStorage.setItem('savedIPs', JSON.stringify(savedIPs));
                initIPs(); // Reload dropdown
                document.getElementById('ip-select').value = newIP;
                input.style.display = 'none';
            }
            resultIP = newIP;
        } else {
            resultIP = '192.168.1.245'; // fallback if left empty
        }
    } else {
        resultIP = select.value;
    }
    
    localStorage.setItem('lastUsedIP', resultIP);
    return resultIP;
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    if(tabId === 'rules-tab') {
        loadRules();
    }
}

// DRAG AND DROP
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    handleFiles(files);
}

let selectedFile = null;

function handleFiles(files) {
    if (files.length === 0) return;
    selectedFile = files[0];
    
    // Assicuriamoci che l'UI del drop-zone sia resettata se ci trascinano un file sopra durante l'analisi
    document.getElementById('btn-select-file').classList.remove('hidden');
    document.getElementById('btn-new-file').classList.add('hidden');
    document.getElementById('drop-zone-text').textContent = "Trascina qui il tuo file CSV o Excel";
    
    // Show file preview with confirm button
    document.getElementById('drop-zone').classList.add('hidden');
    document.getElementById('results-container').classList.add('hidden');
    
    const sizeKB = (selectedFile.size / 1024).toFixed(1);
    document.getElementById('selected-filename').textContent = selectedFile.name;
    document.getElementById('selected-filesize').textContent = sizeKB + ' KB';
    
    const preview = document.getElementById('file-preview');
    preview.style.display = 'block';
    preview.classList.remove('hidden');
}

function resetUpload() {
    selectedFile = null;
    document.getElementById('file-preview').classList.add('hidden');
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('results-container').classList.add('hidden');
    document.getElementById('table-head').innerHTML = '';
    document.getElementById('table-body').innerHTML = '';
    document.getElementById('drop-zone').classList.remove('hidden');
    document.getElementById('file-input').value = '';
    
    // Distruggi grafici
    if (chartGruppo) { chartGruppo.destroy(); chartGruppo = null; }
    if (chartAccount) { chartAccount.destroy(); chartAccount = null; }
    if (chartTeam) { chartTeam.destroy(); chartTeam = null; }
    
    selectedTeamMember = 'ALL';
    teamMembersList = [];
    const teamContainer = document.getElementById('team-selector-container');
    if (teamContainer) teamContainer.classList.add('hidden');
    const teamCard = document.getElementById('chart-team-card');
    if (teamCard) teamCard.classList.add('hidden');
    const nbUserFilter = document.getElementById('nb-modal-user-filter');
    if (nbUserFilter) nbUserFilter.style.display = 'none';

    // Ripristina KPI Cards
    const elOreTot = document.getElementById('kpi-ore-totali');
    if (elOreTot) elOreTot.textContent = '0';
    const elIntTot = document.getElementById('kpi-interventi-totali');
    if (elIntTot) elIntTot.textContent = '0';
    const elIntSub = document.getElementById('kpi-interventi-sub');
    if (elIntSub) elIntSub.textContent = '0 registrazioni';
    const elCS = document.getElementById('kpi-context-switching');
    if (elCS) {
        elCS.textContent = '0';
        elCS.style.color = 'var(--success)';
    }
    
    const kpiNB = document.getElementById('kpi-ore-non-fatturabili');
    if (kpiNB) {
        kpiNB.textContent = '0';
        kpiNB.style.color = '#f59e0b';
    }
    const kpiNBPerc = document.getElementById('kpi-perc-non-fatturabili');
    if (kpiNBPerc) kpiNBPerc.textContent = '(0% del totale)';
    const kpiNBCard = document.getElementById('kpi-card-non-billable');
    if (kpiNBCard) kpiNBCard.style.borderColor = 'var(--border)';
    const filterNB = document.getElementById('filter-non-billable');
    if (filterNB) filterNB.checked = false;

    // Ripristina lo stato del drop-zone
    document.getElementById('btn-select-file').classList.remove('hidden');
    document.getElementById('btn-new-file').classList.add('hidden');
    document.getElementById('drop-zone-text').textContent = "Trascina qui il tuo file CSV o Excel";
}

function startAnalysis() {
    if (!selectedFile) return;
    
    // Show magic overlay
    document.getElementById('file-preview').classList.add('hidden');
    document.getElementById('file-preview').style.display = 'none';
    showMagicOverlay();
    
    document.getElementById('report-filename').textContent = 'File: ' + selectedFile.name;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('ollama_ip', getOllamaIP());

    // Wait for BOTH the API response AND a minimum 5-second animation
    const minDelay = new Promise(resolve => setTimeout(resolve, 5000));
    const apiCall = fetch('/api/upload', {
        method: 'POST',
        body: formData
    }).then(async r => {
        if (!r.ok) {
            const errText = await r.text();
            try {
                const errJson = JSON.parse(errText);
                throw new Error(errJson.detail || 'Errore durante l\'elaborazione');
            } catch(e) {
                throw new Error(errText || `Errore HTTP ${r.status}`);
            }
        }
        return r.json();
    });

    Promise.all([apiCall, minDelay])
    .then(([data]) => {
        hideMagicOverlay();
        if (data.status === 'success') {
            currentData = data.data;
            currentPresenceSummary = data.presence_summary || null;
            selectedTeamMember = 'ALL';
            setupTeamView(currentData);
            
            // Badge Periodo nella top bar
            const periodBadge = document.getElementById('report-period-badge');
            if (periodBadge && currentPresenceSummary && currentPresenceSummary.working_days && currentPresenceSummary.working_days.length > 0) {
                const wDays = currentPresenceSummary.working_days;
                const periodText = wDays.length === 1 ? wDays[0] : `${wDays[0]} — ${wDays[wDays.length - 1]}`;
                const hol = currentPresenceSummary.holidays || [];
                periodBadge.textContent = `Periodo: ${periodText} (${wDays.length} gg lavorativi)` +
                    (hol.length ? ` · esclusi: ${hol.map(h => `${h.date} ${h.name}`).join(', ')}` : '');
            } else if (periodBadge) {
                periodBadge.textContent = '';
            }
            
            updateDashboardView();
            switchTile('tile-presence');
            
            document.getElementById('drop-zone').classList.remove('hidden');
            document.getElementById('btn-select-file').classList.add('hidden');
            document.getElementById('btn-new-file').classList.remove('hidden');
            document.getElementById('drop-zone-text').textContent = "Report generato. Chiudilo per caricarne uno nuovo.";
            
            document.getElementById('results-container').classList.remove('hidden');
            requestAnimationFrame(positionTabThumb);
            document.getElementById('results-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            alert('Errore: ' + (data.detail || 'Operazione fallita'));
            resetUpload();
        }
    })
    .catch(error => {
        hideMagicOverlay();
        alert('Si è verificato un errore: ' + (error.message || error));
        console.error(error);
        resetUpload();
    });
}

// -- Magic Overlay --
// Fasi mostrate durante l'analisi (la richiesta è unica: le fasi si alternano a tempo)
const MAGIC_STEPS = [
    'Lettura del file…',
    'Controllo regole e presenze…',
    "Verifica delle note con l'IA…",
    'Calcolo degli indicatori…',
    'Preparazione della dashboard…'
];
let magicInterval = null;
let magicStepInterval = null;

function showMagicOverlay() {
    const overlay = document.getElementById('magic-overlay');
    overlay.classList.remove('hidden');

    const container = document.getElementById('magic-stars');
    container.innerHTML = '';
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fasi dell'analisi
    const stepEl = document.getElementById('magic-step');
    let step = 0;
    if (stepEl) stepEl.textContent = MAGIC_STEPS[0];
    magicStepInterval = setInterval(() => {
        if (step >= MAGIC_STEPS.length - 1 || !stepEl) return;
        step++;
        stepEl.classList.remove('step-in');
        void stepEl.offsetWidth; // riavvia l'animazione
        stepEl.textContent = MAGIC_STEPS[step];
        stepEl.classList.add('step-in');
    }, 1100);

    if (reduceMotion) return;
    // Scintille luminose che salgono
    magicInterval = setInterval(() => {
        const spark = document.createElement('span');
        spark.className = 'magic-spark';
        spark.style.left = (8 + Math.random() * 84) + '%';
        const size = 2 + Math.random() * 4;
        spark.style.width = spark.style.height = size + 'px';
        const duration = 2.8 + Math.random() * 2.4;
        spark.style.animationDuration = duration + 's';
        spark.style.setProperty('--drift', (Math.random() * 40 - 20) + 'px');
        spark.style.setProperty('--hue', ['#ff4d6d', '#bf5af2', '#64d2ff', '#ffffff'][Math.floor(Math.random() * 4)]);
        container.appendChild(spark);
        setTimeout(() => spark.remove(), duration * 1000 + 200);
    }, 160);
}

function hideMagicOverlay() {
    clearInterval(magicInterval);
    clearInterval(magicStepInterval);
    magicInterval = null;
    magicStepInterval = null;
    document.getElementById('magic-overlay').classList.add('hidden');
    document.getElementById('magic-stars').innerHTML = '';
}

// --- TEAM MANAGEMENT ---
function getUserOfRow(row) {
    if (!row) return '';
    const candidates = [
        row['Responsabile Attività'],
        row['Responsabile Attivita'],
        row['Responsabile'],
        row['Tecnico'],
        row['Collaboratore'],
        row['Risorsa'],
        row['Utente'],
        row['Nome']
    ];
    for (const c of candidates) {
        if (c !== undefined && c !== null) {
            const s = String(c).trim();
            if (s !== '' && s !== 'Dipendente') return s;
        }
    }
    return '';
}

function setupTeamView(data) {
    const userHours = {};
    data.forEach(row => {
        const u = getUserOfRow(row);
        if (u) {
            let ore = 0;
            if ('Consuntivo Ore' in row) ore = safeFloatJS(row['Consuntivo Ore']);
            else if ('Ore' in row) ore = safeFloatJS(row['Ore']);
            else ore = 1;
            userHours[u] = (userHours[u] || 0) + ore;
        }
    });

    teamMembersList = Object.keys(userHours).sort();
    const container = document.getElementById('team-selector-container');
    const select = document.getElementById('team-user-select');
    const badge = document.getElementById('team-stats-badge');
    const nbUserFilter = document.getElementById('nb-modal-user-filter');
    const qualityUserFilter = document.getElementById('filter-user-quality-select');

    if (teamMembersList.length > 1) {
        if (container) container.classList.remove('hidden');
        if (badge) badge.textContent = `${teamMembersList.length} tecnici rilevati`;

        if (select) {
            select.innerHTML = '';
            const optAll = document.createElement('option');
            optAll.value = 'ALL';
            optAll.textContent = `Tutto il Team (Aggregato - ${teamMembersList.length} tecnici)`;
            select.appendChild(optAll);

            teamMembersList.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = `${m} (${userHours[m].toFixed(1)}h)`;
                select.appendChild(opt);
            });
            select.value = selectedTeamMember;
        }

        if (qualityUserFilter) {
            qualityUserFilter.style.display = 'inline-block';
            qualityUserFilter.innerHTML = '';
            const optAll = document.createElement('option');
            optAll.value = 'ALL';
            optAll.textContent = `Tutti i tecnici (${teamMembersList.length})`;
            qualityUserFilter.appendChild(optAll);

            teamMembersList.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = `${m}`;
                qualityUserFilter.appendChild(opt);
            });
            qualityUserFilter.value = selectedTeamMember;
        }

        if (nbUserFilter) {
            nbUserFilter.style.display = 'inline-block';
            nbUserFilter.innerHTML = '';
            const optAll = document.createElement('option');
            optAll.value = 'ALL';
            optAll.textContent = `Tutto il Team (${teamMembersList.length} tecnici)`;
            nbUserFilter.appendChild(optAll);

            teamMembersList.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = `${m}`;
                nbUserFilter.appendChild(opt);
            });
            nbUserFilter.value = selectedTeamMember;
        }
    } else {
        if (container) container.classList.add('hidden');
        if (nbUserFilter) nbUserFilter.style.display = 'none';
        if (qualityUserFilter) qualityUserFilter.style.display = 'none';
    }
}

function onTeamUserChange(val) {
    selectedTeamMember = val || 'ALL';
    
    const select = document.getElementById('team-user-select');
    if (select && select.value !== selectedTeamMember) select.value = selectedTeamMember;

    const qualityUserFilter = document.getElementById('filter-user-quality-select');
    if (qualityUserFilter && qualityUserFilter.value !== selectedTeamMember) qualityUserFilter.value = selectedTeamMember;

    const nbUserFilter = document.getElementById('nb-modal-user-filter');
    if (nbUserFilter && nbUserFilter.value !== selectedTeamMember) nbUserFilter.value = selectedTeamMember;

    const summary = document.getElementById('team-selected-summary');
    const resetBtn = document.getElementById('btn-reset-team-filter');

    if (summary) {
        if (selectedTeamMember === 'ALL') {
            summary.innerHTML = `Visualizzazione: <strong>Tutto il Team</strong>`;
        } else {
            summary.innerHTML = `Visualizzazione: <strong>${escapeHtml(selectedTeamMember)}</strong>`;
        }
    }

    if (resetBtn) {
        resetBtn.style.display = (selectedTeamMember !== 'ALL') ? 'inline-block' : 'none';
    }

    updateDashboardView();
}

function getActiveData() {
    if (!currentData || currentData.length === 0) return [];
    if (!selectedTeamMember || selectedTeamMember === 'ALL') return currentData;
    return currentData.filter(row => getUserOfRow(row) === selectedTeamMember);
}

// ===== TILE SWITCHER =====
function switchTile(tileId) {
    currentActiveTile = tileId;
    document.querySelectorAll('.tile-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tile-tab-btn').forEach(b => b.classList.remove('active'));
    
    const targetPane = document.getElementById(tileId);
    if (targetPane) targetPane.classList.add('active');
    
    const targetBtn = document.getElementById('btn-' + tileId);
    if (targetBtn) targetBtn.classList.add('active');
    positionTabThumb();
    
    if (tileId === 'tile-analytics') {
        if (chartTeam) chartTeam.resize();
        if (chartGruppo) chartGruppo.resize();
        if (chartAccount) chartAccount.resize();
    }
}

// Pillola del segmented control che scorre sotto il tab attivo
function positionTabThumb() {
    const thumb = document.getElementById('tile-nav-thumb');
    const active = document.querySelector('.tile-tab-btn.active');
    if (!thumb || !active) return;
    thumb.style.width = active.offsetWidth + 'px';
    thumb.style.transform = `translateX(${active.offsetLeft}px)`;
}
window.addEventListener('resize', positionTabThumb);

function updateDashboardView() {
    renderPresenceTile();
    renderAnalyticsTile();
    renderResultsTable();
    updateQualityKPIs();
    renderClientsTile();
}

// ===== TILE 1: CONTROLLO PRESENZA ORE =====
function renderPresenceTile() {
    if (!currentPresenceSummary) return;
    
    const ps = currentPresenceSummary;
    const gm = ps.global_metrics || {};
    
    const kpiUsers = document.getElementById('kpi-presence-users');
    const kpiOk = document.getElementById('kpi-presence-ok');
    const kpiPartial = document.getElementById('kpi-presence-partial');
    const kpiMissing = document.getElementById('kpi-presence-missing');
    const kpiMissHours = document.getElementById('kpi-presence-missing-hours');
    
    if (kpiUsers) kpiUsers.textContent = gm.total_users || 0;
    if (kpiOk) kpiOk.textContent = gm.total_ok_days || 0;
    if (kpiPartial) kpiPartial.textContent = gm.total_partial_days || 0;
    if (kpiMissing) kpiMissing.textContent = gm.total_missing_days || 0;
    if (kpiMissHours) kpiMissHours.textContent = (gm.total_missing_hours || 0).toFixed(1) + 'h';
    
    const alertBadge = document.getElementById('presence-badge-alert');
    const totalIssues = (gm.total_partial_days || 0) + (gm.total_missing_days || 0);
    if (alertBadge) {
        if (totalIssues > 0) {
            alertBadge.textContent = totalIssues;
            alertBadge.classList.remove('hidden');
        } else {
            alertBadge.classList.add('hidden');
        }
    }
    
    const head = document.getElementById('presence-head');
    const body = document.getElementById('presence-body');
    if (!head || !body) return;
    
    head.innerHTML = '';
    body.innerHTML = '';
    
    // Header
    const thUser = document.createElement('th');
    thUser.className = 'text-left col-user';
    thUser.textContent = 'Collaboratore';
    head.appendChild(thUser);
    
    const thTotal = document.createElement('th');
    thTotal.className = 'col-hours';
    thTotal.textContent = 'Ore Registrate';
    head.appendChild(thTotal);
    
    const thMiss = document.createElement('th');
    thMiss.className = 'col-deficit';
    thMiss.textContent = 'Deficit Ore';
    head.appendChild(thMiss);
    
    const thCompliance = document.createElement('th');
    thCompliance.className = 'col-status';
    thCompliance.textContent = 'Stato';
    head.appendChild(thCompliance);
    
    const thCS = document.createElement('th');
    thCS.className = 'col-cs';
    thCS.textContent = 'Frammentazione (CS)';
    head.appendChild(thCS);

    const thSat = document.createElement('th');
    thSat.className = 'col-cs';
    thSat.textContent = 'Saturazione';
    head.appendChild(thSat);
    
    (ps.working_days || []).forEach(dayStr => {
        const thDay = document.createElement('th');
        thDay.className = 'col-day';
        thDay.textContent = dayStr;
        head.appendChild(thDay);
    });
    
    // Righe Collaboratori
    (ps.users || []).forEach(u => {
        const tr = document.createElement('tr');
        
        // 1. Nome Collaboratore
        const tdUser = document.createElement('td');
        tdUser.className = 'text-left col-user';
        tdUser.innerHTML = `
            <div class="matrix-user-cell" onclick="filterByTech('${escapeHtml(u.user)}')">
                <span class="user-avatar-icon">${icon('user')}</span>
                <span class="user-name-text">${escapeHtml(u.user)}</span>
            </div>
            <button class="mail-btn" title="Prepara email con le anomalie di ${escapeHtml(u.user)}" onclick="event.stopPropagation(); openAnomaliesMail('${escapeHtml(u.user)}')">${icon('mail')}</button>
        `;
        tr.appendChild(tdUser);
        
        // 2. Ore Totali
        const tdTotal = document.createElement('td');
        tdTotal.className = 'col-hours';
        const totTitle = `Ore lavorate: ${u.total_hours}h` +
            (u.out_of_hours ? ` (di cui ${u.out_of_hours}h fuori orario)` : '') +
            (u.absence_hours ? ` · Assenze: ${u.absence_hours}h` : '') +
            (u.extra_hours ? ` · Esubero: +${u.extra_hours}h` : '');
        tdTotal.title = totTitle;
        tdTotal.innerHTML = `<strong>${u.total_hours.toFixed(2)}h</strong>` +
            (u.absence_hours ? `<div style="font-size:0.72rem; color:#60a5fa;">+${u.absence_hours}h assenza</div>` : '');
        tr.appendChild(tdTotal);
        
        // 3. Deficit Ore Mancanti
        const tdMiss = document.createElement('td');
        tdMiss.className = 'col-deficit';
        const missHours = (u.days ? Object.values(u.days).reduce((acc, d) => acc + (d.missing_hours || 0), 0) : 0);
        if (missHours > 0) {
            tdMiss.innerHTML = `<span style="color: #ef4444; font-weight: 800; font-variant-numeric: tabular-nums;">-${missHours.toFixed(1)}h</span>`;
        } else {
            tdMiss.innerHTML = `<span style="color: #10b981; font-weight: 700; font-variant-numeric: tabular-nums;">0.0h</span>`;
        }
        tr.appendChild(tdMiss);
        
        // 4. Stato
        const tdStatus = document.createElement('td');
        tdStatus.className = 'col-status';
        const sc = u.status_counts || {};
        if (sc.missing > 0) {
            tdStatus.innerHTML = `<span class="matrix-status-pill status-danger">${dot('err')}${sc.missing} gg mancanti</span>`;
        } else if (sc.partial > 0) {
            tdStatus.innerHTML = `<span class="matrix-status-pill status-warning">${dot('warn')}${sc.partial} gg incompleti</span>`;
        } else if (sc.over > 0) {
            tdStatus.innerHTML = `<span class="matrix-status-pill status-warning" title="Ore in orario lavorativo oltre le 8h">${dot('over')}${sc.over} gg in esubero</span>`;
        } else {
            tdStatus.innerHTML = `<span class="matrix-status-pill status-ok">${dot('ok')}Regolare</span>`;
        }
        tr.appendChild(tdStatus);
        
        // 5. Context Switching
        const tdCS = document.createElement('td');
        tdCS.className = 'col-cs';
        const cs = u.context_switching || {};
        tdCS.innerHTML = `<span class="context-switching-pill level-${cs.level || 'low'}" title="${cs.avg_accounts_per_day || 0} account/giorno in media, ${cs.total_unique_accounts || 0} account distinti">${icon('shuffle')}${(cs.percent || 0).toFixed(1)}%</span>`;
        tr.appendChild(tdCS);

        const tdSat = document.createElement('td');
        tdSat.className = 'col-cs';
        const sat = u.saturation || {};
        tdSat.innerHTML = `<span class="saturation-pill level-${sat.level || 'low'}" title="${sat.client_hours || 0}h cliente su ${sat.available_hours || 0}h disponibili">${icon('trend')}${(sat.percent || 0).toFixed(0)}%</span>`;
        tr.appendChild(tdSat);
        
        // Giorni
        (ps.working_days || []).forEach(dayStr => {
            const tdDay = document.createElement('td');
            tdDay.className = 'col-day';
            const dInfo = u.days ? u.days[dayStr] : null;
            const click = `onclick="filterByTechAndDate('${escapeHtml(u.user)}', '${dayStr}')"`;
            const outNote = (dInfo && dInfo.out_of_hours) ? ` + ${dInfo.out_of_hours}h fuori orario (non conteggiate)` : '';
            const absNote = (dInfo && dInfo.absence_hours) ? ` (di cui ${dInfo.absence_hours}h assenza)` : '';
            if (dInfo && dInfo.status === 'off') {
                tdDay.innerHTML = `<span class="day-badge status-off" ${click} title="${escapeHtml(dInfo.label || 'Giorno non lavorativo')}: nessuna ora prevista"><span>${dInfo.hours}h</span><span class="day-badge-sub">${dot('off')}${escapeHtml(dInfo.label || 'Non lav.')}</span></span>`;
            } else if (!dInfo || dInfo.status === 'missing') {
                tdDay.innerHTML = `<span class="day-badge status-missing" ${click} title="Nessuna ora in orario lavorativo. Mancano ${dInfo ? dInfo.missing_hours : 8}h.${outNote}"><span>0.0h</span><span class="day-badge-sub">${dot('err')}Mancante</span></span>`;
            } else if (dInfo.status === 'partial') {
                tdDay.innerHTML = `<span class="day-badge status-partial" ${click} title="Registrate ${dInfo.hours}h su ${dInfo.expected_hours}h${absNote}. Mancano ${dInfo.missing_hours}h.${outNote}"><span>${dInfo.hours}h</span><span class="day-badge-sub">${dot('warn')}-${dInfo.missing_hours}h</span></span>`;
            } else if (dInfo.status === 'absent') {
                tdDay.innerHTML = `<span class="day-badge status-absent" ${click} title="Giornata coperta da assenza (${dInfo.absence_hours}h)"><span>${dInfo.hours}h</span><span class="day-badge-sub">${dot('abs')}Assenza</span></span>`;
            } else if (dInfo.extra_hours > 0) {
                tdDay.innerHTML = `<span class="day-badge status-over" ${click} title="Esubero: ${dInfo.hours}h in orario lavorativo${absNote}, +${dInfo.extra_hours}h oltre le ${dInfo.expected_hours}h.${outNote}"><span>${dInfo.hours}h</span><span class="day-badge-sub">${dot('over')}+${dInfo.extra_hours}h</span></span>`;
            } else {
                const sub = dInfo.out_of_hours ? `${dot('ok')}OK +${dInfo.out_of_hours}h f.o.` : `${dot('ok')}OK`;
                tdDay.innerHTML = `<span class="day-badge status-ok" ${click} title="Giornata regolare: ${dInfo.hours}h${absNote}${outNote}"><span>${dInfo.hours}h</span><span class="day-badge-sub">${sub}</span></span>`;
            }
            tr.appendChild(tdDay);
        });
        
        body.appendChild(tr);
    });
}

function filterByTechAndDate(tech, dateStr) {
    const qualityUserFilter = document.getElementById('filter-user-quality-select');
    if (qualityUserFilter) {
        qualityUserFilter.value = tech || 'ALL';
    }
    selectedTeamMember = tech || 'ALL';
    
    const searchInput = document.getElementById('search-table-input');
    if (searchInput) {
        searchInput.value = dateStr || '';
    }
    
    const filterType = document.getElementById('filter-type-select');
    if (filterType) {
        filterType.value = 'ALL_ROWS';
    }
    
    switchTile('tile-quality');
    renderResultsTable();
    
    const tableEl = document.getElementById('results-table');
    if (tableEl) {
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function filterByTech(tech) {
    const qualityUserFilter = document.getElementById('filter-user-quality-select');
    if (qualityUserFilter) {
        qualityUserFilter.value = tech || 'ALL';
    }
    selectedTeamMember = tech || 'ALL';
    
    const searchInput = document.getElementById('search-table-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    switchTile('tile-quality');
    renderResultsTable();
    
    const tableEl = document.getElementById('results-table');
    if (tableEl) {
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===== TILE 2: ANALYTICS, NON FATTURABILI & GRAFICI =====
function renderAnalyticsTile() {
    const activeData = getActiveData();
    let totalOre = 0;
    let nonBillableOre = 0;
    let absenceOre = 0;
    let workedRows = 0;
    
    activeData.forEach(row => {
        if (isAbsence(row)) { absenceOre += rowHours(row); return; }
        workedRows++;
        let ore = 0;
        if ('Consuntivo Ore' in row) ore = safeFloatJS(row['Consuntivo Ore']);
        else if ('Ore' in row) ore = safeFloatJS(row['Ore']);
        else ore = 1;
        totalOre += ore;
        
        if (getNonBillableCategory(row) !== null) {
            nonBillableOre += ore;
        }
    });
    
    const billableOre = Math.max(0, totalOre - nonBillableOre);
    const percBillable = totalOre > 0 ? ((billableOre / totalOre) * 100).toFixed(0) : 0;
    const percNonBillable = totalOre > 0 ? ((nonBillableOre / totalOre) * 100).toFixed(0) : 0;
    
    const elTotali = document.getElementById('kpi-ore-totali');
    const elSub = document.getElementById('kpi-interventi-sub');
    const elFatt = document.getElementById('kpi-ore-fatturabili');
    const elPercFatt = document.getElementById('kpi-perc-fatturabili');
    const elNonFatt = document.getElementById('kpi-ore-non-fatturabili');
    const elPercNonFatt = document.getElementById('kpi-perc-non-fatturabili');
    const elCS = document.getElementById('kpi-context-switching');
    
    if (elTotali) elTotali.textContent = totalOre.toFixed(1);
    if (elSub) elSub.textContent = `${workedRows} registrazioni` + (absenceOre > 0 ? ` · ${absenceOre.toFixed(1)}h assenze escluse` : '');
    if (elFatt) elFatt.textContent = billableOre.toFixed(1);
    if (elPercFatt) elPercFatt.textContent = `(${percBillable}% del totale)`;
    if (elNonFatt) elNonFatt.textContent = nonBillableOre.toFixed(1);
    if (elPercNonFatt) elPercNonFatt.textContent = `(${percNonBillable}% del totale)`;
    
    // Context Switching KPI (calcolato dal backend: media di 1 - ore_max/ore_tot per giornata)
    let csVal = 0;
    if (selectedTeamMember === 'ALL' && currentPresenceSummary && currentPresenceSummary.global_metrics) {
        csVal = currentPresenceSummary.global_metrics.avg_context_switching || 0;
    } else if (currentPresenceSummary && currentPresenceSummary.users) {
        const uObj = currentPresenceSummary.users.find(u => u.user === selectedTeamMember);
        if (uObj && uObj.context_switching) {
            csVal = uObj.context_switching.percent || 0;
        }
    }
    if (elCS) {
        elCS.textContent = csVal.toFixed(1) + '%';
        elCS.style.color = csColor(csVal);
    }

    // Saturazione KPI (ore cliente / ore disponibili)
    const elSat = document.getElementById('kpi-saturation');
    const elSatSub = document.getElementById('kpi-saturation-sub');
    if (elSat && currentPresenceSummary) {
        const gmS = currentPresenceSummary.global_metrics || {};
        let satVal = gmS.saturation || 0, satLevel = gmS.saturation_level || 'low', client = gmS.total_client_hours || 0, avail = gmS.total_available_hours || 0;
        if (selectedTeamMember !== 'ALL') {
            const uObj = (currentPresenceSummary.users || []).find(u => u.user === selectedTeamMember);
            const st = (uObj && uObj.saturation) || {};
            satVal = st.percent || 0; satLevel = st.level || 'low'; client = st.client_hours || 0; avail = st.available_hours || 0;
        }
        elSat.textContent = satVal.toFixed(0) + '%';
        elSat.style.color = satLevel === 'high' ? 'var(--success)' : (satLevel === 'medium' ? '#f59e0b' : '#ef4444');
        if (elSatSub) elSatSub.textContent = `${client.toFixed(1)}h cliente / ${avail.toFixed(1)}h disponibili (obiettivo ${gmS.saturation_target || 70}%)`;
    }
    
    generateCharts(activeData);
}

// ===== TILE 3: CONTROLLO LOGICO & QUALITÀ NOTE =====
function updateQualityKPIs() {
    if (!currentData) return;
    
    let ruleErrors = 0;
    let aiWarnings = 0;
    let flaggedRows = 0;
    
    currentData.forEach(r => {
        const hasErr = !!r['_Errore_Logico'];
        const hasWarn = !!r['_Avviso_IA'] || !!r['_Avviso'];
        if (hasErr) ruleErrors++;
        if (hasWarn) aiWarnings++;
        if (hasErr || hasWarn) flaggedRows++;
    });
    
    const elErr = document.getElementById('kpi-rule-errors-count');
    const elWarn = document.getElementById('kpi-ai-warnings-count');
    const elTot = document.getElementById('kpi-total-flagged-count');
    const badge = document.getElementById('quality-badge-alert');
    
    if (elErr) elErr.textContent = ruleErrors;
    if (elWarn) elWarn.textContent = aiWarnings;
    if (elTot) elTot.textContent = flaggedRows;
    
    if (badge) {
        if (flaggedRows > 0) {
            badge.textContent = flaggedRows;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function renderResultsTable() {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    if (!head || !body) return;
    head.innerHTML = '';
    body.innerHTML = '';

    if (!currentData || currentData.length === 0) return;

    const filterType = document.getElementById('filter-type-select') ? document.getElementById('filter-type-select').value : 'ALL_ISSUES';
    const filterUser = document.getElementById('filter-user-quality-select') ? document.getElementById('filter-user-quality-select').value : 'ALL';
    const searchQuery = document.getElementById('search-table-input') ? document.getElementById('search-table-input').value.toLowerCase().trim() : '';

    const columns = Object.keys(currentData[0]).filter(c => !c.startsWith('_'));
    
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.replace('_', ' ');
        head.appendChild(th);
    });

    let rowsShown = 0;
    currentData.forEach(row => {
        // Filtro Tecnico
        if (filterUser !== 'ALL' && getUserOfRow(row) !== filterUser) {
            return;
        }

        const hasError = !!row['_Errore_Logico'];
        const hasAiWarning = !!row['_Avviso_IA'];
        const hasRuleWarning = !!row['_Avviso'];
        const hasWarning = hasAiWarning || hasRuleWarning;
        const nbCat = getNonBillableCategory(row);
        const isNonBillable = nbCat !== null;
        const absence = isAbsence(row);

        // Filtro Tipologia
        if (filterType === 'ALL_ISSUES') {
            if (!hasError && !hasWarning) return;
        } else if (filterType === 'ONLY_ERRORS') {
            if (!hasError) return;
        } else if (filterType === 'ONLY_AI') {
            if (!hasWarning) return;
        } else if (filterType === 'NON_BILLABLE') {
            if (!isNonBillable) return;
        }

        // Filtro Ricerca
        if (searchQuery) {
            const rowValues = Object.values(row).join(' ').toLowerCase();
            if (!rowValues.includes(searchQuery)) return;
        }

        rowsShown++;

        // Render Error Band
        if (hasError) {
            const trBand = document.createElement('tr');
            trBand.className = 'error-band';
            const tdBand = document.createElement('td');
            tdBand.colSpan = columns.length;
            tdBand.innerHTML = `<strong>${icon('error')} ERRORE LOGICO:</strong> ${escapeHtml(row['_Errore_Logico'])}`;
            trBand.appendChild(tdBand);
            body.appendChild(trBand);
        }

        // Render Rule Warning Band (note mancanti, esuberi, fuori orario, stato, duplicati)
        if (hasRuleWarning) {
            const trBand = document.createElement('tr');
            trBand.className = 'warning-band';
            const tdBand = document.createElement('td');
            tdBand.colSpan = columns.length;
            tdBand.innerHTML = `<strong>${icon('alert')} AVVISO:</strong> ${escapeHtml(row['_Avviso'])}`;
            trBand.appendChild(tdBand);
            body.appendChild(trBand);
        }

        // Render Info Band (intervento condiviso)
        if (row['_Condiviso']) {
            const trBand = document.createElement('tr');
            trBand.className = 'info-band';
            const tdBand = document.createElement('td');
            tdBand.colSpan = columns.length;
            tdBand.innerHTML = `<strong>${icon('users')} SQUADRA:</strong> ${escapeHtml(row['_Condiviso'])}`;
            trBand.appendChild(tdBand);
            body.appendChild(trBand);
        }

        // Render AI Warning Band
        if (hasAiWarning) {
            const trBand = document.createElement('tr');
            trBand.className = 'warning-band';
            const tdBand = document.createElement('td');
            tdBand.colSpan = columns.length;
            tdBand.innerHTML = `<strong>${icon('bot')} AVVISO IA:</strong> ${escapeHtml(row['_Avviso_IA'])}`;
            trBand.appendChild(tdBand);
            body.appendChild(trBand);
        }

        // Render Actual Data Row
        const tr = document.createElement('tr');
        if (isNonBillable) {
            tr.classList.add('non-billable-highlight');
        }
        columns.forEach(col => {
            const td = document.createElement('td');
            const colLower = col.toLowerCase();
            const val = row[col];
            if (isNonBillable && (colLower.includes('gruppo') || colLower === 'tipo')) {
                td.innerHTML = `${escapeHtml(val)} <span class="badge-non-billable" title="Voce non fatturabile (${escapeHtml(nbCat)})">Non Fatturabile</span>`;
            } else if (absence && (colLower.includes('gruppo') || colLower === 'tipo')) {
                td.innerHTML = `${escapeHtml(val)} <span class="badge-absence" title="Assenza: giustifica la giornata ma non conta come ore lavorate">Assenza</span>`;
            } else if (colLower.includes('responsabile') || colLower === 'tecnico') {
                td.innerHTML = `<span class="team-user-badge" style="cursor:pointer;" onclick="filterByTech('${escapeHtml(val)}')">${icon('user')} ${escapeHtml(val)}</span>`;
            } else {
                td.textContent = val;
                if (val && String(val).length > 40) td.title = String(val);
            }
            tr.appendChild(td);
        });
        body.appendChild(tr);
    });

    if (rowsShown === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = columns.length;
        td.textContent = "Nessun record corrisponde ai filtri selezionati.";
        td.style.textAlign = 'center';
        td.style.color = 'var(--text-secondary)';
        td.style.padding = '30px';
        tr.appendChild(td);
        body.appendChild(tr);
    }
}

// ===== TILE 4: CLIENTI & COMMESSE =====
function clientBucket(row) {
    const g = String(row['Gruppo TimeSheet'] || row['Gruppo Timesheet'] || row['Gruppo'] || '').toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (g.includes('GETTON')) return 'gettoni';
    if (g.includes('CORPO')) return 'corpo';
    if (g.includes('CONSUNTIVO')) return 'consuntivo';
    if (g.includes('SERVIZIO') || g.includes('CONTRATT')) return 'servizio';
    return 'altro';
}

function renderClientsTile() {
    const body = document.getElementById('clients-table-body');
    const foot = document.getElementById('clients-table-foot');
    const sharedBody = document.getElementById('shared-work-body');
    if (!body) return;

    const rows = getActiveData().filter(r => r['_Categoria'] === 'Cliente');
    const byClient = {};
    const tot = { ore: 0, gettoni: 0, addebito: 0, corpo: 0, consuntivo: 0, servizio: 0, altro: 0, n: 0 };
    rows.forEach(r => {
        const acc = String(r['Account'] || r['Cliente'] || r['Commessa'] || 'Senza cliente').trim() || 'Senza cliente';
        const c = byClient[acc] || (byClient[acc] = { ore: 0, gettoni: 0, addebito: 0, corpo: 0, consuntivo: 0, servizio: 0, altro: 0, n: 0, techs: new Set(), commesse: new Set() });
        const ore = rowHours(r);
        const b = clientBucket(r);
        const billed = String(r['T.Registrazione Gettoni'] || '').trim().toUpperCase() === 'DA ADDEBITARE';
        for (const t of [c, tot]) {
            t.ore += ore; t[b] += ore; t.n++;
            if (billed) t.addebito += ore;
        }
        const tech = getUserOfRow(r);
        if (tech) c.techs.add(tech);
        if (r['Commessa']) c.commesse.add(String(r['Commessa']));
    });

    const fmt = v => v ? v.toFixed(2).replace(/\.?0+$/, '') : '–';
    body.innerHTML = '';
    Object.entries(byClient).sort((a, b) => b[1].ore - a[1].ore).forEach(([acc, c]) => {
        const tr = document.createElement('tr');
        tr.title = 'Clicca per vedere le registrazioni di questo cliente';
        tr.onclick = () => filterByClient(acc);
        tr.innerHTML = `
            <td class="text-left"><strong>${escapeHtml(acc)}</strong></td>
            <td><strong>${fmt(c.ore)}</strong></td>
            <td>${fmt(c.gettoni)}</td>
            <td>${fmt(c.addebito)}</td>
            <td>${fmt(c.corpo)}</td>
            <td>${fmt(c.consuntivo)}</td>
            <td>${fmt(c.servizio)}</td>
            <td>${fmt(c.altro)}</td>
            <td>${c.n}</td>
            <td class="text-left wrap">${escapeHtml([...c.techs].join(', '))}</td>
            <td class="text-left wrap">${escapeHtml([...c.commesse].join(', '))}</td>`;
        body.appendChild(tr);
    });
    if (foot) {
        foot.innerHTML = `<tr><td class="text-left">Totale (${Object.keys(byClient).length} clienti)</td><td>${fmt(tot.ore)}</td><td>${fmt(tot.gettoni)}</td><td>${fmt(tot.addebito)}</td><td>${fmt(tot.corpo)}</td><td>${fmt(tot.consuntivo)}</td><td>${fmt(tot.servizio)}</td><td>${fmt(tot.altro)}</td><td>${tot.n}</td><td></td><td></td></tr>`;
    }
    const info = document.getElementById('clients-summary-info');
    if (info) info.textContent = selectedTeamMember === 'ALL' ? 'Tutto il team' : `Tecnico: ${selectedTeamMember}`;

    if (sharedBody) {
        const shared = ((currentPresenceSummary && currentPresenceSummary.shared_work) || [])
            .filter(s => selectedTeamMember === 'ALL' || s.users.includes(selectedTeamMember));
        sharedBody.innerHTML = '';
        if (shared.length === 0) {
            sharedBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: 20px;">Nessun intervento condiviso rilevato.</td></tr>`;
        }
        shared.forEach(s => {
            const tr = document.createElement('tr');
            const double = (s.billed_by || []).length > 1;
            if (double) tr.className = 'double-billing';
            tr.onclick = () => filterByClient(s.account);
            const techs = s.users.map(u => `${escapeHtml(u)} (${s.hours[u]}h)`).join('<br>');
            const billing = double
                ? `<span style="color:#ef4444; font-weight:700;">${icon('alert')} Addebitato da ${s.billed_by.length} tecnici</span>`
                : ((s.billed_by || []).length === 1 ? `Da addebitare: ${escapeHtml(s.billed_by[0])}` : 'Non a gettone');
            tr.innerHTML = `
                <td class="text-left">${escapeHtml(s.date)}</td>
                <td class="text-left"><strong>${escapeHtml(s.account)}</strong></td>
                <td class="text-left">${techs}</td>
                <td class="text-left">${billing}</td>
                <td class="text-left wrap">${s.notes.map(n => escapeHtml(n)).join('<br>')}</td>`;
            sharedBody.appendChild(tr);
        });
    }
}

function filterByClient(account) {
    const searchInput = document.getElementById('search-table-input');
    if (searchInput) searchInput.value = account || '';
    const filterType = document.getElementById('filter-type-select');
    if (filterType) filterType.value = 'ALL_ROWS';
    switchTile('tile-quality');
    renderResultsTable();
}

// ===== EMAIL ANOMALIE PER TECNICO (mailto) =====
const MAILTO_MAX_BODY = 1800; // i client di posta troncano URL troppo lunghi

function openAnomaliesMail(user) {
    const url = buildAnomaliesMailto(user);
    if (url) window.location.href = url;
}

function buildAnomaliesMailto(user) {
    if (!currentData) return null;
    const uObj = ((currentPresenceSummary && currentPresenceSummary.users) || []).find(u => u.user === user) || {};
    const wDays = (currentPresenceSummary && currentPresenceSummary.working_days) || [];
    const period = wDays.length ? `${wDays[0]} - ${wDays[wDays.length - 1]}` : '';

    const lines = [];
    currentData.filter(r => getUserOfRow(r) === user).forEach(r => {
        const msgs = [r['_Errore_Logico'], r['_Avviso'], r['_Avviso_IA']].filter(Boolean).join(' | ');
        if (!msgs) return;
        const d = r['Data'] || r['Giorno'] || r['Data Evasione'] || '';
        const acc = r['Account'] || r['Commessa'] || '';
        const ore = r['Consuntivo Ore'] || r['Ore'] || '';
        lines.push(`- ${d}${acc ? ' · ' + acc : ''}${ore ? ' · ' + ore + 'h' : ''}: ${msgs}`);
    });

    let body = `Ciao,\n\nnel controllo del timesheet${period ? ' del periodo ' + period : ''} sono emerse queste segnalazioni da verificare:\n\n`;
    if (lines.length === 0) {
        body += 'Nessuna anomalia rilevata, grazie!\n';
    } else {
        let included = 0;
        for (const l of lines) {
            if ((body + l).length > MAILTO_MAX_BODY) break;
            body += l + '\n';
            included++;
        }
        if (included < lines.length) body += `... e altre ${lines.length - included} segnalazioni.\n`;
    }
    body += '\nPuoi correggere le registrazioni sul gestionale? Grazie.\n';

    const subject = `Timesheet${period ? ' ' + period : ''}: segnalazioni da verificare`;
    const to = uObj.email || '';
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ===== CHART.JS DASHBOARD =====
let chartGruppo = null;
let chartAccount = null;

const smeupPalette = [
    '#A61D33', '#D32F2F', '#E57373', '#FF5252', '#B71C1C',
    '#424242', '#757575', '#BDBDBD', '#EF5350', '#8E0000',
    '#F44336', '#9E9E9E'
];

// Soglie Context Switching: <=50% verde, <=70% ambra, >70% rosso (allineate al backend)
function csColor(val) {
    if (val <= 50) return 'var(--success)';
    if (val <= 70) return '#f59e0b';
    return '#ef4444';
}

function safeFloatJS(val) {
    if (!val) return 0;
    if (typeof val === 'string') {
        val = val.replace(',', '.').trim();
    }
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
}

// ===== HELPER ORE NON FATTURABILI =====
// Riconosce se una riga appartiene alle categorie non fatturabili richieste:
// 1. ICS Generali (es. IC-GENERALI, ICS Generali, IC Generali, ecc.)
// 2. CLI Attività Commerciali (es. CLI ATTIVITA' COMMERCIALI, Attività Commerciali, ecc.)
// 3. Formazione (es. Formazione, Corsi di Formazione, Formazione Interna, ecc.)
function rowHours(row) {
    if ('Consuntivo Ore' in row) return safeFloatJS(row['Consuntivo Ore']);
    if ('Ore' in row) return safeFloatJS(row['Ore']);
    return 1;
}

// Le assenze (ferie, malattia...) giustificano la giornata ma non sono ore lavorate
function isAbsence(row) {
    return !!row && row['_Categoria'] === 'Assenza';
}

function getNonBillableCategory(row) {
    if (!row) return null;
    // Classificazione calcolata dal backend: Cliente / Interno / Assenza
    if (row['_Categoria']) {
        return row['_Categoria'] === 'Interno' ? (row['_Sottocategoria'] || 'Altre attività interne') : null;
    }
    
    const candidates = [
        row['Gruppo Timesheet'],
        row['Gruppo TimeSheet'],
        row['Gruppo'],
        row['Tipo'],
        row['Tipo Orario'],
        row['Commessa'],
        row['Account'],
        row['Cliente'],
        row['Sottogruppo']
    ];
    
    for (let raw of candidates) {
        if (!raw) continue;
        const s = String(raw).trim().toUpperCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Rimuove accenti (À -> A)
            
        // 1. ICS Generali / IC-GENERALI
        if (s.includes('ICS GENERAL') || s.includes('IC-GENERAL') || s.includes('IC GENERAL') || s.includes('ICS-GENERAL')) {
            return 'ICS Generali';
        }
        // 2. CLI Attività Commerciali
        if (s.includes('ATTIVITA COMMERCIAL') || s.includes('ATTIVITA\' COMMERCIAL') || (s.includes('CLI') && s.includes('COMMERCIAL'))) {
            return "CLI Attività Commerciali";
        }
        // 3. Formazione
        if (s.includes('FORMAZIONE')) {
            return 'Formazione';
        }
    }
    return null;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function generateCharts(data, isExport = false) {
    if (chartGruppo) chartGruppo.destroy();
    if (chartAccount) chartAccount.destroy();

    const sumGruppo = {};
    const countAccount = {};
    let totalOreGruppo = 0;
    
    // Le assenze non sono ore lavorate: escluse da grafici e KPI
    data = data.filter(r => !isAbsence(r));

    // Variabili per i KPI (il Context Switching è calcolato dal backend)
    let totalHoursAll = 0;
    const totalInterventions = data.length;

    // Tracking ore non fatturabili (ICS Generali, CLI Attività Commerciali, Formazione)
    let totalNonBillableHours = 0;
    let nonBillableCount = 0;

    data.forEach(row => {
        // Cerca colonna Ore
        let ore = 0;
        if ('Consuntivo Ore' in row) ore = safeFloatJS(row['Consuntivo Ore']);
        else if ('Ore' in row) ore = safeFloatJS(row['Ore']);
        else ore = 1;

        totalHoursAll += ore;

        // Verifica categoria non fatturabile
        const nbCat = getNonBillableCategory(row);
        if (nbCat) {
            totalNonBillableHours += ore;
            nonBillableCount++;
        }

        // Cerca colonna Gruppo
        let gruppo = 'Sconosciuto';
        if ('Gruppo Timesheet' in row) gruppo = row['Gruppo Timesheet'];
        else if ('Gruppo TimeSheet' in row) gruppo = row['Gruppo TimeSheet'];
        else if ('Gruppo' in row) gruppo = row['Gruppo'];
        
        if (gruppo !== undefined && gruppo !== null) {
            gruppo = String(gruppo).trim();
            if (gruppo !== '') {
                sumGruppo[gruppo] = (sumGruppo[gruppo] || 0) + ore;
                totalOreGruppo += ore;
            }
        }

        // Cerca colonna Account
        let account = 'Nessun Account';
        if ('Account' in row) account = row['Account'];
        else if ('Cliente' in row) account = row['Cliente'];
        else if ('Commessa' in row) account = row['Commessa'];
        
        if (account !== undefined && account !== null) {
            account = String(account).trim();
            if (account !== '') countAccount[account] = (countAccount[account] || 0) + 1;
        }
    });

    // Popola le KPI Cards nel DOM se presenti
    const elOreTot = document.getElementById('kpi-ore-totali');
    if (elOreTot) elOreTot.textContent = totalHoursAll.toFixed(1);
    const elIntTot = document.getElementById('kpi-interventi-totali');
    if (elIntTot) elIntTot.textContent = totalInterventions;

    // Popola KPI Ore Non Fatturabili
    const kpiNB = document.getElementById('kpi-ore-non-fatturabili');
    const kpiNBPerc = document.getElementById('kpi-perc-non-fatturabili');
    const kpiNBCard = document.getElementById('kpi-card-non-billable');
    if (kpiNB) {
        kpiNB.textContent = totalNonBillableHours.toFixed(1);
        const nbPerc = totalHoursAll > 0 ? (totalNonBillableHours / totalHoursAll) * 100 : 0;
        if (kpiNBPerc) {
            kpiNBPerc.textContent = `(${nbPerc.toFixed(1)}% del totale - ${nonBillableCount} int.)`;
        }
        if (totalNonBillableHours === 0) {
            kpiNB.style.color = 'var(--success)';
            if (kpiNBCard) kpiNBCard.style.borderColor = 'var(--border)';
        } else if (nbPerc <= 15) {
            kpiNB.style.color = '#f59e0b'; // Amber
            if (kpiNBCard) kpiNBCard.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        } else {
            kpiNB.style.color = '#ef4444'; // Red
            if (kpiNBCard) kpiNBCard.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        }
    }

    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';

    const renderPie = (ctxId, sortedData, totalOre) => {
        const ctx = document.getElementById(ctxId).getContext('2d');
        const labels = sortedData.map(x => x[0]);
        const dataVals = sortedData.map(x => x[1]);
        
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: smeupPalette,
                    borderWidth: 2,
                    borderColor: isDarkMode ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                onHover: (event, chartElement) => {
                    event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const label = labels[index];
                        showSliceDetails(label);
                    }
                },
                animation: isExport ? false : true,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: textColor, font: { family: getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim(), size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.parsed;
                                const perc = totalOre > 0 ? ((val / totalOre) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${perc}% (${val.toFixed(1)} ore)`;
                            }
                        }
                    }
                }
            }
        });
    };

    const renderBar = (ctxId, sortedData) => {
        const ctx = document.getElementById(ctxId).getContext('2d');
        const labels = sortedData.map(x => x[0]);
        const dataVals = sortedData.map(x => x[1]);
        
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Interventi',
                    data: dataVals,
                    backgroundColor: '#A61D33',
                    borderRadius: 4
                }]
            },
            options: {
                animation: isExport ? false : true,
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { color: textColor, precision: 0, font: { family: getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim() } },
                        grid: { color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                    },
                    x: { 
                        ticks: { color: textColor, font: { family: getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim(), size: 10 } },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.parsed.y} interventi`;
                            }
                        }
                    }
                }
            }
        });
    };

    // Ordina i valori dal più grande al più piccolo
    const sortedGruppo = Object.entries(sumGruppo).sort((a,b) => b[1] - a[1]);
    const sortedAccount = Object.entries(countAccount).sort((a,b) => b[1] - a[1]);

    chartGruppo = renderPie('chart-gruppo', sortedGruppo, totalOreGruppo);
    chartAccount = renderBar('chart-account', sortedAccount);

    // Gestione Grafico Confronto Team
    const teamCard = document.getElementById('chart-team-card');
    if (chartTeam) {
        chartTeam.destroy();
        chartTeam = null;
    }

    if (teamMembersList.length > 1 && selectedTeamMember === 'ALL' && teamCard) {
        teamCard.classList.remove('hidden');
        
        // Calcola per ciascun membro del team ore fatturabili vs non fatturabili
        const memberStats = {};
        teamMembersList.forEach(m => {
            memberStats[m] = { billable: 0, nonBillable: 0 };
        });

        currentData.forEach(r => {
            const u = getUserOfRow(r);
            if (u && memberStats[u] && !isAbsence(r)) {
                let ore = 0;
                if ('Consuntivo Ore' in r) ore = safeFloatJS(r['Consuntivo Ore']);
                else if ('Ore' in r) ore = safeFloatJS(r['Ore']);
                else ore = 1;

                if (getNonBillableCategory(r)) {
                    memberStats[u].nonBillable += ore;
                } else {
                    memberStats[u].billable += ore;
                }
            }
        });

        const sortedMembers = [...teamMembersList].sort((a, b) => {
            const totA = memberStats[a].billable + memberStats[a].nonBillable;
            const totB = memberStats[b].billable + memberStats[b].nonBillable;
            return totB - totA;
        });

        const billableData = sortedMembers.map(m => memberStats[m].billable);
        const nonBillableData = sortedMembers.map(m => memberStats[m].nonBillable);

        // Adatta dinamicamente l'altezza del canvas al numero di membri del team per garantire che tutti i nomi siano visibili
        const teamWrapper = document.getElementById('chart-team-wrapper');
        if (teamWrapper) {
            const calculatedHeight = Math.max(260, sortedMembers.length * 34 + 60);
            teamWrapper.style.height = `${calculatedHeight}px`;
        }

        const ctxTeam = document.getElementById('chart-team').getContext('2d');
        chartTeam = new Chart(ctxTeam, {
            type: 'bar',
            data: {
                labels: sortedMembers,
                datasets: [
                    {
                        label: 'Ore Fatturabili',
                        data: billableData,
                        backgroundColor: '#10b981',
                        borderRadius: 3,
                        maxBarThickness: 22
                    },
                    {
                        label: 'Ore Non Fatturabili',
                        data: nonBillableData,
                        backgroundColor: '#f59e0b',
                        borderRadius: 3,
                        maxBarThickness: 22
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                animation: isExport ? false : true,
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { color: textColor, font: { family: getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim() } },
                        grid: { color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        stacked: true,
                        ticks: { 
                            autoSkip: false,
                            color: textColor, 
                            font: { family: getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim(), size: 11, weight: '600' }
                        },
                        grid: { display: false }
                    }
                },
                onHover: (event, chartElement) => {
                    event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const clickedUser = sortedMembers[index];
                        if (clickedUser) {
                            onTeamUserChange(clickedUser);
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: textColor, font: { family: getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim(), size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.parsed.x;
                                return ` ${context.dataset.label}: ${val.toFixed(1)} ore`;
                            },
                            afterBody: function(context) {
                                if (context && context[0]) {
                                    const idx = context[0].dataIndex;
                                    const m = sortedMembers[idx];
                                    const tot = memberStats[m].billable + memberStats[m].nonBillable;
                                    const nbPerc = tot > 0 ? ((memberStats[m].nonBillable / tot) * 100).toFixed(1) : 0;
                                    return `Totale: ${tot.toFixed(1)}h | Non Fatturabile: ${nbPerc}%\nClicca per visualizzare questo tecnico`;
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
    } else {
        if (teamCard) teamCard.classList.add('hidden');
    }
}

// EXPORT PDF
function exportPDF() {
    const originalTheme = document.body.getAttribute('data-theme');
    const originalTransition = document.body.style.transition;
    const element = document.getElementById('results-container');
    
    // 1. Forza il tema chiaro per il ricalcolo di textColor nei grafici
    document.body.style.transition = 'none';
    document.body.setAttribute('data-theme', 'light');

    // 2. Forza esplicitamente le variabili CSS su element. 
    // In questo modo html2canvas erediterà queste variabili dal nodo corrente, senza cercare nel :root
    element.style.setProperty('--bg-color', '#ffffff');
    element.style.setProperty('--text-primary', '#1e293b');
    element.style.setProperty('--text-secondary', '#475569');
    element.style.setProperty('--card-bg', '#f1f5f9');
    element.style.setProperty('--glass-border', 'rgba(166, 29, 51, 0.15)');
    element.style.setProperty('--table-header', 'rgba(166, 29, 51, 0.05)');
    element.style.setProperty('--table-hover', 'rgba(166, 29, 51, 0.02)');
    element.style.backgroundColor = '#ffffff';
    element.style.color = '#1e293b';

    // 3. Modifica esplicita per i tag H4 che contengono i titoli dei grafici
    const h4Elements = element.querySelectorAll('h4');
    h4Elements.forEach(h4 => h4.style.color = '#475569');

    // 4. Rigenera i grafici (disabilitando le animazioni)
    const activeDataForPDF = getActiveData();
    if (activeDataForPDF && activeDataForPDF.length > 0) {
        generateCharts(activeDataForPDF, true);
    }
    
    // Attendiamo 500ms per assicurarci che Chart.js abbia renderizzato il canvas e il DOM sia aggiornato
    setTimeout(() => {
        const filenameText = document.getElementById('report-filename').textContent;
        const baseName = filenameText ? filenameText.replace('File: ', '').split('.')[0] : 'Report';
        
        const opt = {
            margin:       0.5,
            filename:     `Timesheet_AI_${baseName}.pdf`,
            image:        { type: 'jpeg', quality: 1.0 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true,
                backgroundColor: '#ffffff'
            },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
        };
        
        html2pdf().set(opt).from(element).save().then(() => {
            // Ripristina tutte le variabili CSS e gli stili inline
            element.style.removeProperty('--bg-color');
            element.style.removeProperty('--text-primary');
            element.style.removeProperty('--text-secondary');
            element.style.removeProperty('--card-bg');
            element.style.removeProperty('--glass-border');
            element.style.removeProperty('--table-header');
            element.style.removeProperty('--table-hover');
            element.style.backgroundColor = '';
            element.style.color = '';
            h4Elements.forEach(h4 => h4.style.color = '');
            
            // Ripristina il tema del body
            document.body.setAttribute('data-theme', originalTheme);
            void document.body.offsetHeight; // Forza reflow
            document.body.style.transition = originalTransition;
            
            // Rigenera i grafici originali
            const activeDataRestore = getActiveData();
            if (activeDataRestore && activeDataRestore.length > 0) {
                generateCharts(activeDataRestore, false);
            }
        });
    }, 500);
}

// RULES ENGINE
function loadRules() {
    fetch('/api/rules')
    .then(res => res.json())
    .then(data => {
        currentRules = data.rules;
        const list = document.getElementById('rules-list');
        if (!list) return;
        list.innerHTML = '';
        currentRules.forEach(rule => {
            const li = document.createElement('li');
            li.style.opacity = rule.is_active ? '1' : '0.5';
            const invalidNote = rule.validation_error
                ? `<div style="font-size:0.8rem; color:#f59e0b; margin-top:4px;">${icon('alert')} Regola non valida: ${escapeHtml(rule.validation_error)}</div>`
                : '';
            
            li.innerHTML = `
                <div style="flex:1; padding-right: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <label class="switch">
                            <input type="checkbox" onchange="toggleRule(${rule.id}, this.checked)" ${rule.is_active ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                        <strong style="color: var(--accent); text-decoration: ${rule.is_active ? 'none' : 'line-through'};">${escapeHtml(rule.rule_name)}</strong>
                    </div>
                    <div style="font-family: monospace; font-size:0.85rem; color: var(--text-secondary); margin: 5px 0; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px;">
                        ${escapeHtml(rule.expression)}
                    </div>
                    <div style="font-size:0.85rem; color: #fca5a5;">Errore se vero: ${escapeHtml(rule.error_message)}</div>
                    ${invalidNote}
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <button class="btn secondary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="editRule(${rule.id})">Modifica</button>
                    <button class="delete-btn" onclick="deleteRule(${rule.id})">Elimina</button>
                </div>
            `;
            list.appendChild(li);
        });
    });
}

// Esegue una chiamata alle API regole mostrando l'eventuale errore restituito dal server
function ruleRequest(url, method, payload) {
    const opts = { method };
    if (payload) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(payload);
    }
    return fetch(url, opts).then(async res => {
        if (!res.ok) {
            let detail = `Errore HTTP ${res.status}`;
            try { detail = (await res.json()).detail || detail; } catch (e) {}
            alert(detail);
            throw new Error(detail);
        }
        return res.json();
    });
}

function addRule() {
    const payload = {
        rule_name: document.getElementById('r-name').value,
        expression: document.getElementById('r-expr').value,
        error_message: document.getElementById('r-msg').value,
        is_active: true
    };

    if (editingId) {
        // Find existing rule to preserve its active status if needed, but we can default to true on save or keep it.
        const existing = currentRules.find(r => r.id === editingId);
        if (existing) payload.is_active = existing.is_active;

        ruleRequest(`/api/rules/${editingId}`, 'PUT', payload).then(() => {
            editingId = null;
            document.getElementById('btn-save-rule').textContent = "Salva Regola";
            resetRuleForm();
            loadRules();
        }).catch(() => {});
    } else {
        ruleRequest('/api/rules', 'POST', payload).then(() => {
            resetRuleForm();
            loadRules();
        }).catch(() => {});
    }
}

function resetRuleForm() {
    document.getElementById('r-name').value = '';
    document.getElementById('r-expr').value = '';
    document.getElementById('r-msg').value = '';
}

function editRule(id) {
    const rule = currentRules.find(r => r.id === id);
    if (!rule) return;
    
    document.getElementById('r-name').value = rule.rule_name;
    document.getElementById('r-expr').value = rule.expression;
    document.getElementById('r-msg').value = rule.error_message;
    
    editingId = id;
    document.getElementById('btn-save-rule').textContent = "Aggiorna Regola";
    document.getElementById('r-name').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleRule(id, isActive) {
    const rule = currentRules.find(r => r.id === id);
    if (!rule) return;
    
    const payload = {
        rule_name: rule.rule_name,
        expression: rule.expression,
        error_message: rule.error_message,
        is_active: isActive
    };

    ruleRequest(`/api/rules/${id}`, 'PUT', payload).finally(() => loadRules()).catch(() => {});
}

function deleteRule(id) {
    ruleRequest(`/api/rules/${id}`, 'DELETE').finally(() => loadRules()).catch(() => {});
}



function generateWithAI() {
    const prompt = document.getElementById('ai-prompt').value;
    const ip = getOllamaIP();
    if (!prompt) return;

    const btn = document.getElementById('btn-generate-ai');
    btn.textContent = "Generazione in corso...";
    btn.disabled = true;

    fetch('/api/generate_rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natural_language: prompt, ollama_ip: ip })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            document.getElementById('r-expr').value = data.expression;
            if (data.validation_error) {
                alert("Attenzione: l'espressione generata non supera la validazione di sicurezza e non potrà essere salvata così com'è.\n\n" + data.validation_error);
            }
            // Scroll to the expression box
            document.getElementById('r-expr').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            alert("Errore generazione: " + data.detail);
        }
    })
    .catch(err => {
        alert("Errore di comunicazione col server: " + err);
    })
    .finally(() => {
        btn.textContent = "Genera Logica Python";
        btn.disabled = false;
    });
}

// ===== EASTER EGG =====
let logoClickCount = 0;
let easterEggTimer = null;

function triggerEasterEgg() {
    logoClickCount++;
    
    // Resetta il conteggio se passa troppo tempo tra un click e l'altro
    clearTimeout(easterEggTimer);
    easterEggTimer = setTimeout(() => { logoClickCount = 0; }, 2000);
    
    if (logoClickCount === 5) {
        logoClickCount = 0;
        
        // Effetto terremoto
        document.body.classList.add('shake-active');
        setTimeout(() => document.body.classList.remove('shake-active'), 3000);
        
        // Fuochi d'artificio
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { 
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            }));
            confetti(Object.assign({}, defaults, { 
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            }));
        }, 250);
    }
}

// ===== POPUP DETTAGLI GRUPPO (DOUGHNUT CLICK) =====
function showSliceDetails(label) {
    const modal = document.getElementById('details-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalTableHead = document.getElementById('modal-table-head');
    const modalTableBody = document.getElementById('modal-table-body');
    
    // Filtra le righe del timesheet appartenenti al gruppo cliccato considerando il filtro utente attivo
    const activeData = getActiveData();
    const filteredRows = activeData.filter(row => {
        let gruppo = '';
        if ('Gruppo Timesheet' in row) gruppo = row['Gruppo Timesheet'];
        else if ('Gruppo TimeSheet' in row) gruppo = row['Gruppo TimeSheet'];
        else if ('Gruppo' in row) gruppo = row['Gruppo'];
        return String(gruppo || '').trim() === String(label).trim();
    });

    const userLabel = (selectedTeamMember && selectedTeamMember !== 'ALL') ? ` [${selectedTeamMember}]` : '';
    modalTitle.textContent = `Dettagli Gruppo: ${label}${userLabel} (${filteredRows.length} righe)`;
    modalTableBody.innerHTML = '';
    modalTableHead.innerHTML = '';

    // Verifica se c'è almeno un collaboratore non vuoto (escludiamo il collaboratore virtuale "Dipendente")
    const hasUtente = filteredRows.some(row => {
        let ut = getUserOfRow(row);
        return String(ut).trim() !== '' && String(ut).trim() !== 'Dipendente';
    });

    // Costruisci gli header dinamicamente
    let headersHTML = `<th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600;">Data</th>`;
    if (hasUtente) {
        headersHTML += `<th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600;">Tecnico / Responsabile</th>`;
    }
    headersHTML += `
        <th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600;">Account</th>
        <th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600; text-align: right;">Ore</th>
        <th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600;">Descrizione</th>
    `;
    modalTableHead.innerHTML = headersHTML;
    
    filteredRows.forEach((row, idx) => {
        try {
            let dateVal = row['Data'] || row['Giorno'] || row['Data Evasione'] || '';
            let utente = getUserOfRow(row);
            let account = row['Account'] || row['Cliente'] || row['Commessa'] || '';
            let ore = row['Consuntivo Ore'] || row['Ore'] || '0';
            let desc = row['Descrizione'] || row['Nota'] || '';
            
            const tr = document.createElement('tr');
            let cellsHTML = `<td style="padding: 10px; border-bottom: 1px solid var(--border);">${dateVal}</td>`;
            if (hasUtente) {
                cellsHTML += `<td style="padding: 10px; border-bottom: 1px solid var(--border); font-weight: 600;">${utente}</td>`;
            }
            cellsHTML += `
                <td style="padding: 10px; border-bottom: 1px solid var(--border);">${account}</td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right; font-weight: 600;">${ore}</td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--text-secondary); max-width: 350px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${desc}">${desc}</td>
            `;
            tr.innerHTML = cellsHTML;
            modalTableBody.appendChild(tr);
        } catch (err) {
            console.error('Error rendering row at index ' + idx, err, row);
        }
    });
    
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeModal() {
    const modal = document.getElementById('details-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function handleOverlayClick(event) {
    if (event.target.id === 'details-modal') {
        closeModal();
    }
}

// ===== POPUP DETTAGLI ORE NON FATTURABILI =====
function showNonBillableModal() {
    if (!currentData || currentData.length === 0) return;
    
    const modal = document.getElementById('non-billable-modal');
    if (!modal) return;

    const nbUserFilter = document.getElementById('nb-modal-user-filter');
    if (nbUserFilter && teamMembersList.length > 1) {
        nbUserFilter.value = selectedTeamMember || 'ALL';
    }

    renderNonBillableModalTable();
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function renderNonBillableModalTable() {
    if (!currentData || currentData.length === 0) return;
    
    const nbUserFilter = document.getElementById('nb-modal-user-filter');
    const userFilter = (nbUserFilter && teamMembersList.length > 1) ? nbUserFilter.value : (selectedTeamMember || 'ALL');

    const dataset = (userFilter === 'ALL') ? currentData : currentData.filter(r => getUserOfRow(r) === userFilter);

    const modalBadge = document.getElementById('nb-modal-badge');
    const modalSubtitle = document.getElementById('nb-modal-subtitle');
    const pillsContainer = document.getElementById('nb-category-pills');
    const tableHead = document.getElementById('nb-modal-table-head');
    const tableBody = document.getElementById('nb-modal-table-body');
    
    const nonBillableRows = [];
    let sumHours = 0;
    const catStats = {
        'ICS Generali': { hours: 0, count: 0, class: 'ics' },
        'CLI Attività Commerciali': { hours: 0, count: 0, class: 'commercial' },
        'Formazione': { hours: 0, count: 0, class: 'training' },
        'Altre attività interne': { hours: 0, count: 0, class: 'other' }
    };
    
    let totalAllHours = 0;
    dataset.forEach(row => {
        if (isAbsence(row)) return;
        let ore = 0;
        if ('Consuntivo Ore' in row) ore = safeFloatJS(row['Consuntivo Ore']);
        else if ('Ore' in row) ore = safeFloatJS(row['Ore']);
        else ore = 1;
        totalAllHours += ore;
        
        const cat = getNonBillableCategory(row);
        if (cat) {
            nonBillableRows.push({ row, cat, ore });
            sumHours += ore;
            if (!catStats[cat]) catStats[cat] = { hours: 0, count: 0, class: 'commercial' };
            catStats[cat].hours += ore;
            catStats[cat].count++;
        }
    });

    const percOfTotal = totalAllHours > 0 ? ((sumHours / totalAllHours) * 100).toFixed(1) : '0.0';
    
    if (modalBadge) {
        modalBadge.textContent = `${sumHours.toFixed(1)} ore (${percOfTotal}% del totale)`;
    }
    if (modalSubtitle) {
        const userSuffix = (userFilter !== 'ALL') ? ` per <strong>${escapeHtml(userFilter)}</strong>` : '';
        modalSubtitle.innerHTML = `Trovati <strong>${nonBillableRows.length} interventi non fatturabili</strong> su ${dataset.length} totali (${totalAllHours.toFixed(1)} ore complessive analizzate)${userSuffix}.`;
    }
    
    // Genera Pills Categorie
    if (pillsContainer) {
        pillsContainer.innerHTML = '';
        for (const [catName, stats] of Object.entries(catStats)) {
            const pill = document.createElement('div');
            pill.className = `pill-nb ${stats.class}`;
            pill.innerHTML = `<strong>${catName}:</strong> ${stats.hours.toFixed(1)} h <span style="opacity: 0.75; font-size: 0.75rem;">(${stats.count} int.)</span>`;
            pillsContainer.appendChild(pill);
        }
    }
    
    // Verifica se c'è almeno un collaboratore/responsabile valorizzato
    const hasUtente = nonBillableRows.some(item => {
        const ut = getUserOfRow(item.row);
        return ut !== '' && ut !== 'Dipendente';
    });
    
    // Intestazioni tabella
    let thHTML = `<th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600; width: 100px;">Data</th>`;
    if (hasUtente) {
        thHTML += `<th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600; width: 150px;">Tecnico / Resp.</th>`;
    }
    thHTML += `
        <th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600; width: 150px;">Categoria</th>
        <th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600; width: 150px;">Account / Commessa</th>
        <th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600; text-align: right; width: 80px;">Ore</th>
        <th style="padding: 12px 10px; color: var(--text-secondary); font-weight: 600;">Note / Descrizione</th>
    `;
    if (tableHead) tableHead.innerHTML = thHTML;
    if (tableBody) tableBody.innerHTML = '';
    
    if (nonBillableRows.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = hasUtente ? 6 : 5;
        td.style.textAlign = 'center';
        td.style.padding = '35px';
        td.style.color = 'var(--success)';
        td.innerHTML = icon('check') + ' <strong>Ottimo risultato!</strong> Nessuna ora non fatturabile rilevata tra le categorie monitorate.';
        tr.appendChild(td);
        if (tableBody) tableBody.appendChild(tr);
    } else {
        nonBillableRows.forEach(item => {
            const r = item.row;
            const dateVal = r['Data'] || r['Giorno'] || r['Data Evasione'] || '-';
            const utente = getUserOfRow(r) || '-';
            const account = r['Account'] || r['Cliente'] || r['Commessa'] || '-';
            const oreVal = item.ore.toFixed(2);
            
            // Note e Descrizione (verifica tutti i possibili campi usati nei gestionali)
            const desc = (r['Descrizione'] || '').trim();
            const note = (r['Note'] || r['Nota'] || r['Dettaglio'] || r['Attività'] || r['Oggetto'] || '').trim();
            
            let notesHTML = '';
            if (note && desc && note.toLowerCase() !== desc.toLowerCase()) {
                notesHTML = `<div style="font-weight: 600; color: var(--text);">${escapeHtml(desc)}</div>
                             <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 3px; font-style: italic;">${icon('note')} Note: ${escapeHtml(note)}</div>`;
            } else {
                const mainText = note || desc || '<span style="color: var(--text-secondary); font-style: italic;">Nessuna nota presente</span>';
                notesHTML = `<div style="color: var(--text); line-height: 1.4;">${mainText === '-' ? mainText : (note || desc ? escapeHtml(mainText) : mainText)}</div>`;
            }
            
            let catBadgeClass = 'commercial';
            if (item.cat === 'ICS Generali') catBadgeClass = 'ics';
            else if (item.cat === 'Formazione') catBadgeClass = 'training';
            else if (item.cat === 'Altre attività interne') catBadgeClass = 'other';
            
            const tr = document.createElement('tr');
            let trHTML = `<td style="padding: 10px; border-bottom: 1px solid var(--border); white-space: nowrap; font-size: 0.85rem;">${escapeHtml(dateVal)}</td>`;
            if (hasUtente) {
                trHTML += `<td style="padding: 10px; border-bottom: 1px solid var(--border); font-weight: 600;"><span class="team-user-badge">${icon('user')} ${escapeHtml(utente)}</span></td>`;
            }
            trHTML += `
                <td style="padding: 10px; border-bottom: 1px solid var(--border);">
                    <span class="pill-nb ${catBadgeClass}" style="padding: 2px 8px; font-size: 0.75rem;">${escapeHtml(item.cat)}</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">${escapeHtml(account)}</td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right; font-weight: 700; color: #f59e0b;">${oreVal}</td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border); max-width: 450px; word-break: break-word;">${notesHTML}</td>
            `;
            tr.innerHTML = trHTML;
            if (tableBody) tableBody.appendChild(tr);
        });
    }
}

function closeNonBillableModal() {
    const modal = document.getElementById('non-billable-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function handleNonBillableOverlayClick(event) {
    if (event.target.id === 'non-billable-modal') {
        closeNonBillableModal();
    }
}

function copyNonBillableText() {
    if (!currentData || currentData.length === 0) return;
    
    const nbUserFilter = document.getElementById('nb-modal-user-filter');
    const userFilter = (nbUserFilter && teamMembersList.length > 1) ? nbUserFilter.value : (selectedTeamMember || 'ALL');
    const dataset = (userFilter === 'ALL') ? currentData : currentData.filter(r => getUserOfRow(r) === userFilter);

    const nonBillableRows = [];
    let sumHours = 0;
    dataset.forEach(row => {
        const cat = getNonBillableCategory(row);
        if (cat) {
            let ore = 0;
            if ('Consuntivo Ore' in row) ore = safeFloatJS(row['Consuntivo Ore']);
            else if ('Ore' in row) ore = safeFloatJS(row['Ore']);
            else ore = 1;
            nonBillableRows.push({ row, cat, ore });
            sumHours += ore;
        }
    });
    
    if (nonBillableRows.length === 0) {
        alert('Nessuna riga non fatturabile da copiare.');
        return;
    }
    
    let text = `=== RIEPILOGO ORE NON FATTURABILI ===\n`;
    if (userFilter !== 'ALL') {
        text += `Tecnico: ${userFilter}\n`;
    }
    text += `Totale Ore Non Fatturabili: ${sumHours.toFixed(1)} ore (${nonBillableRows.length} registrazioni)\n\n`;
    
    nonBillableRows.forEach((item, idx) => {
        const r = item.row;
        const dateVal = r['Data'] || r['Giorno'] || r['Data Evasione'] || '-';
        const utente = getUserOfRow(r);
        const account = r['Account'] || r['Cliente'] || r['Commessa'] || '-';
        const desc = (r['Descrizione'] || '').trim();
        const note = (r['Note'] || r['Nota'] || r['Dettaglio'] || r['Attività'] || r['Oggetto'] || '').trim();
        
        text += `${idx + 1}. [${dateVal}] ${utente ? utente + ' | ' : ''}${item.cat} (${account}) - ${item.ore.toFixed(2)} ore\n`;
        if (note && desc && note.toLowerCase() !== desc.toLowerCase()) {
            text += `   Descrizione: ${desc}\n`;
            text += `   Note: ${note}\n`;
        } else {
            text += `   Note/Desc: ${note || desc || 'Nessuna nota'}\n`;
        }
        text += `\n`;
    });
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Elenco delle ore non fatturabili e relative note copiato negli appunti!');
        }).catch(() => {
            window.prompt('Copia il testo:', text);
        });
    } else {
        window.prompt('Copia il testo:', text);
    }
}

// Chiusura con tasto ESC per tutti i modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeNonBillableModal();
    }
});
