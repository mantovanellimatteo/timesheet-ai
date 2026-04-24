let currentData = [];
let currentRules = [];
let editingId = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initParticles();
    initIPs();
    if(document.getElementById('rules-tab').classList.contains('active')) {
        loadRules();
    }
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
    }).then(r => r.json());

    Promise.all([apiCall, minDelay])
    .then(([data]) => {
        hideMagicOverlay();
        if (data.status === 'success') {
            currentData = data.data;
            renderTable(currentData);
            document.getElementById('drop-zone').classList.remove('hidden');
            
            // Cambia l'UI del drop-zone per invitare a un nuovo report
            document.getElementById('btn-select-file').classList.add('hidden');
            document.getElementById('btn-new-file').classList.remove('hidden');
            document.getElementById('drop-zone-text').textContent = "Report generato. Chiudilo per caricarne uno nuovo.";
            
        } else {
            alert('Errore: ' + data.detail);
            resetUpload();
        }
    })
    .catch(error => {
        hideMagicOverlay();
        alert('Si è verificato un errore durante l\'elaborazione del file.');
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

function renderTable(data) {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    head.innerHTML = '';
    body.innerHTML = '';

    if (data.length === 0) return;

    const filterErrors = document.getElementById('filter-errors').checked;

    // Filter out internal columns from headers
    const columns = Object.keys(data[0]).filter(c => c !== '_Errore_Logico' && c !== '_Avviso_IA');
    
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.replace('_', ' ');
        head.appendChild(th);
    });

    // Create rows
    let rowsShown = 0;
    data.forEach(row => {
        const hasError = row['_Errore_Logico'] !== '';
        const hasWarning = row['_Avviso_IA'] !== '';
        
        if (filterErrors && !hasError && !hasWarning) {
            return; // Skip OK rows
        }
        rowsShown++;

        // Render Error Band
        if (hasError) {
            const trBand = document.createElement('tr');
            trBand.className = 'error-band';
            const tdBand = document.createElement('td');
            tdBand.colSpan = columns.length;
            tdBand.innerHTML = `<strong>⛔ ERRORE LOGICO:</strong> ${row['_Errore_Logico']}`;
            trBand.appendChild(tdBand);
            body.appendChild(trBand);
        }

        // Render Warning Band
        if (hasWarning) {
            const trBand = document.createElement('tr');
            trBand.className = 'warning-band';
            const tdBand = document.createElement('td');
            tdBand.colSpan = columns.length;
            tdBand.innerHTML = `<strong>⚠️ AVVISO IA:</strong> ${row['_Avviso_IA']}`;
            trBand.appendChild(tdBand);
            body.appendChild(trBand);
        }

        // Render Actual Data Row
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col];
            tr.appendChild(td);
        });
        body.appendChild(tr);
    });

    if (rowsShown === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = columns.length;
        td.textContent = "Nessun errore o avviso trovato! Tutto perfetto.";
        td.style.textAlign = 'center';
        td.style.color = 'var(--success)';
        tr.appendChild(td);
        body.appendChild(tr);
    }

    document.getElementById('results-container').classList.remove('hidden');
}

function toggleFilter() {
    renderTable(currentData);
}

// EXPORT PDF
function exportPDF() {
    const element = document.getElementById('results-container');
    const filenameText = document.getElementById('report-filename').textContent;
    const baseName = filenameText ? filenameText.replace('File: ', '').split('.')[0] : 'Report';
    
    const opt = {
        margin:       0.5,
        filename:     `Timesheet_AI_${baseName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    
    html2pdf().set(opt).from(element).save();
}

// RULES ENGINE
function loadRules() {
    fetch('/api/rules')
    .then(res => res.json())
    .then(data => {
        currentRules = data.rules;
        const list = document.getElementById('rules-list');
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
