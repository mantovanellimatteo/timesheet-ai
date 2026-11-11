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
}

function updateThemeButton() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const btn = document.getElementById('theme-btn');
    if (btn) {
        btn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
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
                periodBadge.textContent = `📅 Periodo: ${periodText} (${wDays.length} gg lavorativi)`;
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
const MAGIC_EMOJIS = ['✨', '⭐', '🌟', '💫', '✦', '✶', '❋', '✺', '✷', '🔮', '✦'];
let magicInterval = null;

function showMagicOverlay() {
    const overlay = document.getElementById('magic-overlay');
    overlay.classList.remove('hidden');
    
    const container = document.getElementById('magic-stars');
    container.innerHTML = '';
    
    // Spawn stars continuously
    magicInterval = setInterval(() => {
        const star = document.createElement('div');
        star.className = 'magic-star';
        star.textContent = MAGIC_EMOJIS[Math.floor(Math.random() * MAGIC_EMOJIS.length)];
        star.style.left = Math.random() * 90 + 5 + '%';
        star.style.bottom = '10%';
        const duration = 2.5 + Math.random() * 2.5;
        star.style.animationDuration = duration + 's';
        star.style.animationDelay = '0s';
        star.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
        container.appendChild(star);
        // Cleanup after animation
        setTimeout(() => star.remove(), duration * 1000 + 200);
    }, 200);
}

function hideMagicOverlay() {
    clearInterval(magicInterval);
    magicInterval = null;
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
            optAll.textContent = `👥 Tutto il Team (Aggregato - ${teamMembersList.length} tecnici)`;
            select.appendChild(optAll);

            teamMembersList.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = `👤 ${m} (${userHours[m].toFixed(1)}h)`;
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
                opt.textContent = `👤 ${m}`;
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
    
    if (tileId === 'tile-analytics') {
        if (chartTeam) chartTeam.resize();
        if (chartGruppo) chartGruppo.resize();
        if (chartAccount) chartAccount.resize();
    }
}

function updateDashboardView() {
    renderPresenceTile();
    renderAnalyticsTile();
    renderResultsTable();
    updateQualityKPIs();
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
        tdUser.innerHTML = `<span style="font-weight: 700; cursor: pointer; color: var(--accent); display: flex; align-items: center; gap: 6px; white-space: nowrap;" onclick="filterByTech('${escapeHtml(u.user)}')">👤 ${escapeHtml(u.user)}</span>`;
        tr.appendChild(tdUser);
        
        // 2. Ore Totali
        const tdTotal = document.createElement('td');
        tdTotal.className = 'col-hours';
        tdTotal.innerHTML = `<strong>${u.total_hours.toFixed(2)}h</strong>`;
        tr.appendChild(tdTotal);
        
        // 3. Deficit Ore Mancanti
        const tdMiss = document.createElement('td');
        tdMiss.className = 'col-deficit';
        const missHours = (u.days ? Object.values(u.days).reduce((acc, d) => acc + (d.missing_hours || 0), 0) : 0);
        if (missHours > 0) {
            tdMiss.innerHTML = `<span style="color: #ef4444; font-weight: 800;">-${missHours.toFixed(1)}h</span>`;
        } else {
            tdMiss.innerHTML = `<span style="color: #10b981; font-weight: 700;">0.0h</span>`;
        }
        tr.appendChild(tdMiss);
        
        // 4. Stato
        const tdStatus = document.createElement('td');
        tdStatus.className = 'col-status';
        const sc = u.status_counts || {};
        if (sc.missing > 0) {
            tdStatus.innerHTML = `<span class="team-chip" style="color: #ef4444; border-color: rgba(239,68,68,0.45); background: rgba(239,68,68,0.12); font-weight: 700;">🔴 ${sc.missing} gg assente</span>`;
        } else if (sc.partial > 0) {
            tdStatus.innerHTML = `<span class="team-chip" style="color: #f59e0b; border-color: rgba(245,158,11,0.45); background: rgba(245,158,11,0.12); font-weight: 700;">🟡 ${sc.partial} gg incompleti</span>`;
        } else {
            tdStatus.innerHTML = `<span class="team-chip" style="color: #10b981; border-color: rgba(16,185,129,0.45); background: rgba(16,185,129,0.12); font-weight: 700;">🟢 Regolare</span>`;
        }
        tr.appendChild(tdStatus);
        
        // 5. Context Switching
        const tdCS = document.createElement('td');
        tdCS.className = 'col-cs';
        const cs = u.context_switching || {};
        tdCS.innerHTML = `<span class="context-switching-pill level-${cs.level || 'low'}" title="${cs.total_unique_accounts || 0} commesse/account distinti">🔀 ${cs.avg_accounts_per_day || 0}/gg</span>`;
        tr.appendChild(tdCS);
        
        // Giorni
        (ps.working_days || []).forEach(dayStr => {
            const tdDay = document.createElement('td');
            tdDay.className = 'col-day';
            const dInfo = u.days ? u.days[dayStr] : null;
            if (!dInfo || dInfo.status === 'missing') {
                tdDay.innerHTML = `<span class="day-badge status-missing" onclick="filterByTechAndDate('${escapeHtml(u.user)}', '${dayStr}')" title="Nessuna ora registrata. Mancano 8h."><span>0.0h</span><span class="day-badge-sub">🔴 Assente</span></span>`;
            } else if (dInfo.status === 'partial') {
                tdDay.innerHTML = `<span class="day-badge status-partial" onclick="filterByTechAndDate('${escapeHtml(u.user)}', '${dayStr}')" title="Registrate ${dInfo.hours}h su 8h. Mancano ${dInfo.missing_hours}h."><span>${dInfo.hours}h</span><span class="day-badge-sub">🟡 -${dInfo.missing_hours}h</span></span>`;
            } else {
                tdDay.innerHTML = `<span class="day-badge status-ok" onclick="filterByTechAndDate('${escapeHtml(u.user)}', '${dayStr}')" title="Giornata regolare: ${dInfo.hours}h registrate"><span>${dInfo.hours}h</span><span class="day-badge-sub">🟢 OK</span></span>`;
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
    
    activeData.forEach(row => {
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
    if (elSub) elSub.textContent = `${activeData.length} registrazioni`;
    if (elFatt) elFatt.textContent = billableOre.toFixed(1);
    if (elPercFatt) elPercFatt.textContent = `(${percBillable}% del totale)`;
    if (elNonFatt) elNonFatt.textContent = nonBillableOre.toFixed(1);
    if (elPercNonFatt) elPercNonFatt.textContent = `(${percNonBillable}% del totale)`;
    
    // Context Switching KPI
    let csVal = 0;
    if (selectedTeamMember === 'ALL' && currentPresenceSummary && currentPresenceSummary.global_metrics) {
        csVal = currentPresenceSummary.global_metrics.avg_context_switching || 0;
    } else if (currentPresenceSummary && currentPresenceSummary.users) {
        const uObj = currentPresenceSummary.users.find(u => u.user === selectedTeamMember);
        if (uObj && uObj.context_switching) {
            csVal = uObj.context_switching.avg_accounts_per_day || 0;
        }
    }
    if (elCS) elCS.textContent = csVal.toFixed(1);
    
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
        const hasWarn = !!r['_Avviso_IA'];
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

    const columns = Object.keys(currentData[0]).filter(c => c !== '_Errore_Logico' && c !== '_Avviso_IA');
    
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
        const hasWarning = !!row['_Avviso_IA'];
        const nbCat = getNonBillableCategory(row);
        const isNonBillable = nbCat !== null;

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
            tdBand.innerHTML = `<strong>⛔ ERRORE LOGICO:</strong> ${escapeHtml(row['_Errore_Logico'])}`;
            trBand.appendChild(tdBand);
            body.appendChild(trBand);
        }

        // Render Warning Band
        if (hasWarning) {
            const trBand = document.createElement('tr');
            trBand.className = 'warning-band';
            const tdBand = document.createElement('td');
            tdBand.colSpan = columns.length;
            tdBand.innerHTML = `<strong>⚠️ AVVISO IA:</strong> ${escapeHtml(row['_Avviso_IA'])}`;
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
            } else if (colLower.includes('responsabile') || colLower === 'tecnico') {
                td.innerHTML = `<span class="team-user-badge" style="cursor:pointer;" onclick="filterByTech('${escapeHtml(val)}')">👤 ${escapeHtml(val)}</span>`;
            } else {
                td.textContent = val;
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

// ===== CHART.JS DASHBOARD =====
let chartGruppo = null;
let chartAccount = null;

const smeupPalette = [
    '#A61D33', '#D32F2F', '#E57373', '#FF5252', '#B71C1C',
    '#424242', '#757575', '#BDBDBD', '#EF5350', '#8E0000',
    '#F44336', '#9E9E9E'
];

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
function getNonBillableCategory(row) {
    if (!row) return null;
    
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
    
    // Variabili per i KPI e il Context Switching
    let totalHoursAll = 0;
    const totalInterventions = data.length;
    const dailyUserWork = {}; // Raggruppamento per "Utente|Data" per il CS

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

        // Estrai Utente e Data per calcolare il Context Switching
        let utente = getUserOfRow(row) || 'Sconosciuto';

        let dataVal = 'Sconosciuta';
        if ('Data' in row) dataVal = row['Data'];
        else if ('Giorno' in row) dataVal = row['Giorno'];
        else if ('Data Evasione' in row) dataVal = row['Data Evasione'];
        dataVal = String(dataVal || '').trim();

        // Calcola il CS solo per righe diverse da attività generali interne
        const isInternalGeneral = gruppo === 'IC-GENERALI' || gruppo === 'ICS Generali' || (nbCat === 'ICS Generali');
        if (!isInternalGeneral && utente !== 'Sconosciuto' && dataVal !== 'Sconosciuta') {
            const key = `${utente}|${dataVal}`;
            if (!dailyUserWork[key]) {
                dailyUserWork[key] = { total: 0, accounts: {} };
            }
            dailyUserWork[key].accounts[account] = (dailyUserWork[key].accounts[account] || 0) + ore;
            dailyUserWork[key].total += ore;
        }
    });

    // Calcola il Context Switching Medio
    let csSum = 0;
    let csCount = 0;

    for (const key in dailyUserWork) {
        const dayData = dailyUserWork[key];
        if (dayData.total > 0) {
            let maxHoursOnSingleAccount = 0;
            for (const acc in dayData.accounts) {
                if (dayData.accounts[acc] > maxHoursOnSingleAccount) {
                    maxHoursOnSingleAccount = dayData.accounts[acc];
                }
            }
            // CS% = (1 - (ore_max_cliente / ore_totali_giorno))
            const cs = 1 - (maxHoursOnSingleAccount / dayData.total);
            csSum += cs;
            csCount++;
        }
    }

    const avgCS = csCount > 0 ? (csSum / csCount) * 100 : 0;

    // Popola le KPI Cards nel DOM se presenti
    const elOreTot = document.getElementById('kpi-ore-totali');
    if (elOreTot) elOreTot.textContent = totalHoursAll.toFixed(1);
    const elIntTot = document.getElementById('kpi-interventi-totali');
    if (elIntTot) elIntTot.textContent = totalInterventions;
    const elIntSub = document.getElementById('kpi-interventi-sub');
    if (elIntSub) elIntSub.textContent = `${totalInterventions} registrazioni`;

    const kpiCS = document.getElementById('kpi-context-switching');
    kpiCS.textContent = avgCS.toFixed(1) + '%';
    
    // Applica colore in base alle soglie (Verde <= 50%, Giallo <= 70%, Rosso > 70%)
    if (avgCS <= 50) {
        kpiCS.style.color = 'var(--success)';
    } else if (avgCS <= 70) {
        kpiCS.style.color = '#f59e0b'; // Amber/Yellow
    } else {
        kpiCS.style.color = '#ef4444'; // Red
    }

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
                        labels: { color: textColor, font: { family: 'Nunito', size: 11 } }
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
                        ticks: { color: textColor, precision: 0, font: { family: 'Nunito' } },
                        grid: { color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                    },
                    x: { 
                        ticks: { color: textColor, font: { family: 'Nunito', size: 10 } },
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
            if (u && memberStats[u]) {
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
                        ticks: { color: textColor, font: { family: 'Nunito' } },
                        grid: { color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        stacked: true,
                        ticks: { 
                            autoSkip: false,
                            color: textColor, 
                            font: { family: 'Nunito', size: 11, weight: '600' }
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
                        labels: { color: textColor, font: { family: 'Nunito', size: 11 } }
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
                                    return `Totale: ${tot.toFixed(1)}h | Non Fatturabile: ${nbPerc}%\n👉 Clicca per visualizzare questo tecnico`;
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
            
            li.innerHTML = `
                <div style="flex:1; padding-right: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <label class="switch">
                            <input type="checkbox" onchange="toggleRule(${rule.id}, this.checked)" ${rule.is_active ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                        <strong style="color: var(--accent); text-decoration: ${rule.is_active ? 'none' : 'line-through'};">${rule.rule_name}</strong>
                    </div>
                    <div style="font-family: monospace; font-size:0.85rem; color: var(--text-secondary); margin: 5px 0; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px;">
                        ${rule.expression}
                    </div>
                    <div style="font-size:0.85rem; color: #fca5a5;">Errore se vero: ${rule.error_message}</div>
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

        fetch(`/api/rules/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(() => {
            editingId = null;
            document.getElementById('btn-save-rule').textContent = "Salva Regola";
            resetRuleForm();
            loadRules();
        });
    } else {
        fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(() => {
            resetRuleForm();
            loadRules();
        });
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

    fetch(`/api/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(() => loadRules());
}

function deleteRule(id) {
    fetch(`/api/rules/${id}`, { method: 'DELETE' }).then(() => loadRules());
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
        'Formazione': { hours: 0, count: 0, class: 'training' }
    };
    
    let totalAllHours = 0;
    dataset.forEach(row => {
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
        td.innerHTML = '🎉 <strong>Ottimo risultato!</strong> Nessuna ora non fatturabile rilevata tra le categorie monitorate.';
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
                             <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 3px; font-style: italic;">📝 Note: ${escapeHtml(note)}</div>`;
            } else {
                const mainText = note || desc || '<span style="color: var(--text-secondary); font-style: italic;">Nessuna nota presente</span>';
                notesHTML = `<div style="color: var(--text); line-height: 1.4;">${mainText === '-' ? mainText : (note || desc ? escapeHtml(mainText) : mainText)}</div>`;
            }
            
            let catBadgeClass = 'commercial';
            if (item.cat === 'ICS Generali') catBadgeClass = 'ics';
            else if (item.cat === 'Formazione') catBadgeClass = 'training';
            
            const tr = document.createElement('tr');
            let trHTML = `<td style="padding: 10px; border-bottom: 1px solid var(--border); white-space: nowrap; font-size: 0.85rem;">${escapeHtml(dateVal)}</td>`;
            if (hasUtente) {
                trHTML += `<td style="padding: 10px; border-bottom: 1px solid var(--border); font-weight: 600;"><span class="team-user-badge">👤 ${escapeHtml(utente)}</span></td>`;
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
