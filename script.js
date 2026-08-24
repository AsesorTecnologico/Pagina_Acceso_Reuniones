/**
 * MEET ROTATIVO - Frontend JavaScript
 * Reuniones desde Google Sheets
 */

// ======================== CONFIGURACIÓN ========================
// ⚠️ REEMPLAZA ESTE ID CON EL ID DE TU HOJA DE CÁLCULO
const SPREADSHEET_ID = '1rRUnbZ2HHNQI0DJigFqJLfQVWPK_X6QF5ReUSCPJIIs';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;

// Estado global
let fechasProgramadas = { meet1: [], meet2: [], meet3: [] };
let currentProfile = 'user';
const ADMIN_PASSWORD = 'admin123';

// ======================== FUNCIONES DE FECHAS ========================

function formatearFecha(fechaStr) {
    if (!fechaStr) return "No programada";
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/**
 * LÓGICA CORRECTA:
 * Buscar la PRIMERA fecha que sea >= hoy (hoy o futura)
 * Si hoy está en la lista, muestra hoy
 * Si hoy ya pasó, muestra la siguiente fecha futura
 * Si todas son pasadas, muestra la primera (próximo ciclo)
 */
function obtenerFechaReunion(fechasArray) {
    if (!fechasArray || fechasArray.length === 0) return null;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Ordenar fechas cronológicamente
    const fechasOrdenadas = [...fechasArray].sort();
    
    // Buscar la primera fecha que sea >= hoy (hoy o futura)
    for (let fechaStr of fechasOrdenadas) {
        const fecha = new Date(fechaStr);
        fecha.setHours(0, 0, 0, 0);
        if (fecha >= hoy) {
            return fechaStr;
        }
    }
    
    // Si todas las fechas son pasadas, devolver la primera (próximo ciclo)
    return fechasOrdenadas[0];
}

function calcularDiferenciaDias(fechaStr) {
    if (!fechaStr) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaStr);
    fecha.setHours(0, 0, 0, 0);
    return Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
}

function esFechaHoy(fechaStr) {
    if (!fechaStr) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaStr);
    fecha.setHours(0, 0, 0, 0);
    return fecha.getTime() === hoy.getTime();
}

function actualizarTarjetas() {
    for (let key of ['meet1', 'meet2', 'meet3']) {
        const fechas = fechasProgramadas[key];
        const fechaReunion = obtenerFechaReunion(fechas);
        const esHoy = esFechaHoy(fechaReunion);
        const diffDias = calcularDiferenciaDias(fechaReunion);
        const messageDiv = document.getElementById(`info-message-${key}`);
        const messageText = document.getElementById(`message-text-${key}`);
        const reunionDateSpan = document.getElementById(`reunion-date-${key}`);
        
        if (reunionDateSpan) {
            reunionDateSpan.innerText = fechaReunion ? formatearFecha(fechaReunion) : "Sin fechas";
        }
        
        if (!fechaReunion) {
            messageDiv.className = 'info-message warning';
            messageText.innerHTML = '⚠️ No hay fechas programadas. Contacta al administrador.';
        } else if (esHoy) {
            messageDiv.className = 'info-message today';
            messageText.innerHTML = '🎯 REUNIÓN Conéctate puntualmente.';
        } else if (diffDias === 1) {
            messageDiv.className = 'info-message';
            messageText.innerHTML = `⏳ MAÑANA es la reunión (${formatearFecha(fechaReunion)}). Prepárate.`;
        } else if (diffDias >= 2) {
            messageDiv.className = 'info-message';
            messageText.innerHTML = `🗓️ Próxima reunión: ${formatearFecha(fechaReunion)} (en ${diffDias} días).`;
        }
    }
}

// ======================== CARGAR DATOS DESDE GOOGLE SHEETS ========================

async function syncFromGoogleSheets() {
    const syncStatus = document.getElementById('syncStatus');
    const syncText = document.getElementById('syncText');
    const lastUpdateSpan = document.getElementById('lastUpdate');
    
    syncStatus.className = 'sync-status loading';
    syncText.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Sincronizando...';
    
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const csvText = await response.text();
        const rows = csvText.split('\n').filter(row => row.trim().length > 0);
        
        const nuevasFechas = { meet1: [], meet2: [], meet3: [] };
        
        for (let i = 1; i < rows.length; i++) {
            let line = rows[i];
            let columns = [];
            let inQuotes = false;
            let current = '';
            
            for (let char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    columns.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            columns.push(current.trim());
            
            if (columns.length >= 2) {
                let reunionId = columns[0].replace(/^"|"$/g, '').trim();
                let fecha = columns[1].replace(/^"|"$/g, '').trim();
                
                if (nuevasFechas.hasOwnProperty(reunionId) && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    nuevasFechas[reunionId].push(fecha);
                }
            }
        }
        
        for (let key of ['meet1', 'meet2', 'meet3']) {
            nuevasFechas[key].sort();
        }
        
        let hayDatos = false;
        for (let key of ['meet1', 'meet2', 'meet3']) {
            if (nuevasFechas[key].length > 0) hayDatos = true;
        }
        
        if (hayDatos) {
            fechasProgramadas = nuevasFechas;
            lastUpdateSpan.innerHTML = `📅 Actualizado: ${new Date().toLocaleTimeString()}`;
            syncStatus.className = 'sync-status synced';
            syncText.innerHTML = '<i class="fas fa-check-circle"></i> Sincronizado';
        } else {
            throw new Error('No se encontraron datos');
        }
        
        actualizarTarjetas();
        
        const sheetLink = document.getElementById('sheetLink');
        if (sheetLink) {
            sheetLink.href = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
        }
        
        return true;
    } catch (error) {
        console.error('Error:', error);
        syncStatus.className = 'sync-status error';
        syncText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Usando datos de ejemplo';
        usarDatosEjemplo();
        actualizarTarjetas();
        return false;
    }
}

function usarDatosEjemplo() {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaHoy = `${año}-${mes}-${dia}`;
    
    const fechaSiguiente = new Date(hoy);
    fechaSiguiente.setDate(hoy.getDate() + 5);
    const fechaProxima = `${fechaSiguiente.getFullYear()}-${String(fechaSiguiente.getMonth() + 1).padStart(2, '0')}-${String(fechaSiguiente.getDate()).padStart(2, '0')}`;
    
    const fechaTercera = new Date(hoy);
    fechaTercera.setDate(hoy.getDate() + 15);
    const fechaTerceraStr = `${fechaTercera.getFullYear()}-${String(fechaTercera.getMonth() + 1).padStart(2, '0')}-${String(fechaTercera.getDate()).padStart(2, '0')}`;
    
    fechasProgramadas = {
        meet1: [fechaHoy, fechaProxima, fechaTerceraStr],
        meet2: [fechaHoy, fechaProxima, fechaTerceraStr],
        meet3: [fechaHoy, fechaProxima, fechaTerceraStr]
    };
}

// ======================== PERFILES ========================

function setProfile(profile, password = null) {
    if (profile === 'admin') {
        const pwd = password || prompt('🔐 Contraseña de administrador:');
        if (pwd !== ADMIN_PASSWORD) {
            alert('Contraseña incorrecta');
            return false;
        }
        currentProfile = 'admin';
        document.getElementById('profile-name').innerHTML = '👑 Administrador';
        document.getElementById('profile-name').className = 'profile-badge admin';
        document.getElementById('switchToAdminBtn').style.display = 'none';
        document.getElementById('switchToUserBtn').style.display = 'inline-block';
        document.getElementById('adminPanel').classList.add('visible');
    } else {
        currentProfile = 'user';
        document.getElementById('profile-name').innerHTML = '👤 Usuario';
        document.getElementById('profile-name').className = 'profile-badge user';
        document.getElementById('switchToAdminBtn').style.display = 'inline-block';
        document.getElementById('switchToUserBtn').style.display = 'none';
        document.getElementById('adminPanel').classList.remove('visible');
    }
    return true;
}

// ======================== MODAL ========================

let pendingUrl = '';
const modal = document.getElementById('welcomeModal');
const modalMessage = document.getElementById('modalMessage');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');

function showWelcomeModal(url, salaNombre) {
    pendingUrl = url;
    modalMessage.innerHTML = `✨ Estás por unirte a <strong>${salaNombre}</strong>.<br><br>Confirma para ingresar a la sala.`;
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
}

function closeModal() {
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    pendingUrl = '';
}

modalConfirm.onclick = () => {
    if (pendingUrl) window.open(pendingUrl, '_blank', 'noopener,noreferrer');
    closeModal();
};

modalCancel.onclick = closeModal;
modal.onclick = (e) => {
    if (e.target === modal) closeModal();
};

function bindCardEvents() {
    document.querySelectorAll('.meet-card').forEach(card => {
        const url = card.getAttribute('data-url');
        const nombre = card.getAttribute('data-nombre');
        const handler = (e) => {
            e.stopPropagation();
            if (url) showWelcomeModal(url, nombre);
        };
        
        const btn = card.querySelector('.btn-meet');
        const preview = card.querySelector('.link-preview');
        if (btn) btn.addEventListener('click', handler);
        if (preview) preview.addEventListener('click', handler);
        
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-meet') || e.target.closest('.link-preview') || e.target.closest('.video-link')) return;
            handler(e);
        });
    });
}

// ======================== PARTÍCULAS ========================

function createParticles() {
    const container = document.getElementById('particleCanvas');
    if (!container) return;
    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        const size = Math.random() * 10 + 3;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = Math.random() * 12 + 5 + 's';
        p.style.animationDelay = Math.random() * 8 + 's';
        p.style.background = `radial-gradient(circle, rgba(200,240,230,0.3), rgba(90,190,160,0.1))`;
        container.appendChild(p);
    }
}

// ======================== INICIALIZACIÓN ========================

async function init() {
    createParticles();
    bindCardEvents();
    
    document.getElementById('switchToAdminBtn').onclick = () => setProfile('admin');
    document.getElementById('switchToUserBtn').onclick = () => setProfile('user');
    
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) {
        refreshBtn.onclick = async () => {
            await syncFromGoogleSheets();
            alert('Datos sincronizados');
        };
    }
    
    await syncFromGoogleSheets();
    setProfile('user');
    
    // Sincronización periódica cada 5 minutos
    setInterval(async () => {
        await syncFromGoogleSheets();
    }, 300000);
}

init();
