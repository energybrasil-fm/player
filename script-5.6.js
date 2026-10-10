import { stations } from './estacoes-4.0.js';
        import { updateIntervalTime, isValidTrack, fetchItunesData, fetchStationData, fetchLyrics } from './api_config-2.1.js';

// ==========================================
// DECLARAÇÃO DE ELEMENTOS DOM E VARIÁVEIS
// ==========================================

if (!stations || stations.length === 0) {
    console.error("Nenhuma estação encontrada!");
    throw new Error("Arquivo estacoes vazio.");
}

const audioPlayer = document.getElementById('audioPlayer');
const previewAudio = document.getElementById('previewAudio');
const introAudio = new Audio();

let isPlayingIntro = false;
let introPlayedForCurrentStation = false; 

const appContainer = document.getElementById('appContainer');
const historyGrid = document.getElementById('historyGrid');

const homePlayBtn = document.getElementById('homePlayBtn');
const playerPlayBtn = document.getElementById('playerPlayBtn');
const stickyPlayBtn = document.getElementById('stickyPlayBtn');
const playerPlayIcon = document.getElementById('playerPlayIcon');
const stickyPlayIcon = document.getElementById('stickyPlayIcon');
const mainPlayerControls = document.getElementById('mainPlayerControls');
const visualizerRing = document.getElementById('visualizerRing');

const circularArtWrapper = document.querySelector('.circular-art-wrapper');
const shareOverlay = document.getElementById('shareOverlay');
const shareFacebook = document.getElementById('shareFacebook');
const shareTwitter = document.getElementById('shareTwitter');

window.currentVisualizerColor = [74, 222, 128]; 
window.currentVisualizerPalette = [[74, 222, 128], [59, 130, 246], [244, 63, 94]];

window.currentSongDuration = 0;
window.currentSongElapsed = 0;
window.lastSongUpdateTimeRefMs = Date.now(); 

let autoQualityCooldown = false;
let stableHighBufferTicks = 0; 
let lowBufferTicks = 0;
let reconnectAttempts = 0;

window.changeStation = null;
window.selectQualityMode = null;
window.togglePreview = null;
window.openQualityModal = null;
window.showListenerToast = null;
window.showGenericToast = null;
window.toggleRecording = null;
window.openSleepModal = null;
window.setSleepTimer = null;
window.toggleHistoryActions = null;
window.removeFavorite = null;

window.isRelaxModeOn = false;

let sleepTimerTimeout = null;
const CORS_PROXY = 'https://images.weserv.nl/?url=';

// ==========================================
// GOOGLE IMA (VAST) ADS SYSTEM
// ==========================================
let adDisplayContainer;
let adsLoader;
let adsManager;
let prerollPlayed = false;

const VAST_TAG_URL = 'url_ads';

function initIMA() {
    if (typeof google === 'undefined' || !google.ima) return; 
    const adVideoElement = document.getElementById('adVideoElement');
    const adContainer = document.getElementById('adContainer');
    adDisplayContainer = new google.ima.AdDisplayContainer(adContainer, adVideoElement);
    adsLoader = new google.ima.AdsLoader(adDisplayContainer);
    adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, onAdsManagerLoaded, false);
    adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);
}

function playPrerollAd() {
    if (typeof google === 'undefined' || !google.ima || !adsLoader) {
        prerollPlayed = true;
        toggleLivePlay();
        return;
    }
    
    prerollPlayed = true;
    const adOverlay = document.getElementById('adOverlay');
    const adVideoElement = document.getElementById('adVideoElement');
    
    adOverlay.style.display = 'flex';
    
    adVideoElement.load();
    adDisplayContainer.initialize();
    
    const adsRequest = new google.ima.AdsRequest();
    adsRequest.adTagUrl = VAST_TAG_URL;
    adsRequest.linearAdSlotWidth = window.innerWidth;
    adsRequest.linearAdSlotHeight = window.innerHeight;
    adsRequest.nonLinearAdSlotWidth = window.innerWidth;
    adsRequest.nonLinearAdSlotHeight = window.innerHeight;
    
    adsLoader.requestAds(adsRequest);
}

function onAdsManagerLoaded(adsManagerLoadedEvent) {
    const adsRenderingSettings = new google.ima.AdsRenderingSettings();
    adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
    
    const adVideoElement = document.getElementById('adVideoElement');
    adsManager = adsManagerLoadedEvent.getAdsManager(adVideoElement, adsRenderingSettings);
    
    adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
    adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdComplete);
    adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED, onAdComplete);
    adsManager.addEventListener(google.ima.AdEvent.Type.USER_CLOSE, onAdComplete);
    
    try {
        adsManager.init(window.innerWidth, window.innerHeight, google.ima.ViewMode.NORMAL);
        adsManager.start();
    } catch (adError) {
        onAdError();
    }
}

function onAdError() { resumeToStream(); }
function onAdComplete() { resumeToStream(); }

function resumeToStream() {
    if (adsManager) { adsManager.destroy(); }
    const adOverlay = document.getElementById('adOverlay');
    if(adOverlay) adOverlay.style.display = 'none';
    
    if (!isPlaying) { toggleLivePlay(); }
}

window.addEventListener('resize', () => {
    if (adsManager) adsManager.resize(window.innerWidth, window.innerHeight, google.ima.ViewMode.NORMAL);
});

initIMA();

// ==========================================
// COMPARTILHAMENTO
// ==========================================
let shareTimeout;

if (circularArtWrapper) {
    circularArtWrapper.addEventListener('click', () => {
        if (shareOverlay && shareOverlay.style.display === 'none') return;
        
        const isShowing = circularArtWrapper.classList.contains('show-share');
        if (isShowing) {
            circularArtWrapper.classList.remove('show-share');
            clearTimeout(shareTimeout);
        } else {
            circularArtWrapper.classList.add('show-share');
            clearTimeout(shareTimeout);
            shareTimeout = setTimeout(() => {
                circularArtWrapper.classList.remove('show-share');
            }, 4500);
        }
    });
}

function shareAction(urlPlatform) {
    if(!currentTrackMetadata) return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Ouvindo ${currentTrackMetadata.title} de ${currentTrackMetadata.artist}`);
    window.open(`${urlPlatform}?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
    circularArtWrapper.classList.remove('show-share');
}

if (shareFacebook) shareFacebook.addEventListener('click', (e) => { e.stopPropagation(); shareAction('https://www.facebook.com/sharer/sharer.php'); });
if (shareTwitter) shareTwitter.addEventListener('click', (e) => { e.stopPropagation(); shareAction('https://twitter.com/intent/tweet'); });

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
let previousListenersCount = -1; 

window.showGenericToast = function(title, desc, iconClass, colorHex) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-msg`;
    
    toast.innerHTML = `
        <div class="toast-icon" style="background: ${colorHex}22; color: ${colorHex}; border: 1px solid ${colorHex}44; box-shadow: 0 0 10px ${colorHex}22;">
            <i class="bi ${iconClass}"></i>
        </div>
        <div class="toast-content">
            <span class="toast-title" style="color: ${colorHex}">${title}</span>
            <span class="toast-desc">${desc}</span>
        </div>
        <div class="toast-progress">
            <div class="toast-progress-bar" style="background: ${colorHex};"></div>
        </div>
    `;

    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
            if (toastContainer.contains(toast)) toastContainer.removeChild(toast);
        }, 400); 
    }, 4000); 
};

window.showListenerToast = function(type, totalListeners) {
    const isConnect = type === 'connect';
    const titleText = isConnect ? 'Novo Ouvinte' : 'Ouvinte Saiu';
    const descText = isConnect 
        ? `um novo ouvinte se conectou. Total: <strong>${totalListeners}</strong>.` 
        : `um ouvinte se desconectou. Total: <strong>${totalListeners}</strong>.`;
        
    window.showGenericToast(
        titleText, 
        descText, 
        isConnect ? 'bi bi-person-plus-fill' : 'bi bi-person-dash-fill', 
        isConnect ? '#4ade80' : '#f43f5e'
    );
};

// ==========================================
// GRAVAÇÃO DE ÁUDIO
// ==========================================
let recordController = null;
let recordedChunks = [];
let isRecording = false;
let recordMimeType = '';
let recordExtension = 'mp3';

window.toggleRecording = async function() {
    const recordBtn = document.getElementById('recordBtn');
    const headerDropdown = document.getElementById('headerDropdown');
    const station = stations[currentStationIndex];

    if (station.record === false || String(station.record).toLowerCase() === "false") {
        window.showGenericToast('Gravação Bloqueada', 'Esta estação não permite a gravação da transmissão.', 'bi bi-ban', '#f43f5e');
        if(headerDropdown) headerDropdown.classList.remove('show');
        return;
    }

    if (!isRecording) {
        try {
            const streamUrl = getCurrentStreamUrl(true);
            if (!streamUrl) {
                window.showGenericToast('Aviso', 'Nenhuma transmissão ativa para gravar.', 'bi-exclamation-triangle-fill', '#fceb05');
                headerDropdown.classList.remove('show');
                return;
            }

            recordController = new AbortController();
            recordedChunks = [];

            headerDropdown.classList.remove('show');
            window.showGenericToast('Conectando', 'Iniciando captura da transmissão...', 'bi-hourglass-split', '#3b82f6');

            const response = await fetch(streamUrl, { signal: recordController.signal });
            
            if (!response.ok) throw new Error('Network response was not ok');

            recordMimeType = response.headers.get('content-type') || '';
            const mimeLower = recordMimeType.toLowerCase();
            
            if (mimeLower.includes('mpeg')) recordExtension = 'mp3';
            else if (mimeLower.includes('aac')) recordExtension = 'aac';
            else if (mimeLower.includes('ogg')) recordExtension = 'ogg';
            else if (mimeLower.includes('mp4')) recordExtension = 'm4a';
            else recordExtension = 'mp3';

            isRecording = true;
            recordBtn.innerHTML = '<i class="bi bi-stop-circle" style="color: #f43f5e;"></i> Parar Gravação';
            window.showGenericToast('Gravando', `Capturando formato original (.${recordExtension})`, 'bi-record-circle', '#ef4444');

            const reader = response.body.getReader();

            const readStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (value) recordedChunks.push(value);
                    }
                } catch (err) {
                    if (err.name === 'AbortError') {
                        saveRecording();
                    } else {
                        stopAndDiscardRecording();
                        window.showGenericToast('Erro', 'A conexão da gravação foi interrompida.', 'bi-x-circle-fill', '#f43f5e');
                    }
                }
            };
            
            readStream();

        } catch(e) {
            if (e.name !== 'AbortError') {
                window.showGenericToast('Erro de Segurança', 'O servidor bloqueou a gravação direta (CORS).', 'bi-shield-lock-fill', '#f43f5e');
            }
            stopAndDiscardRecording();
        }
    } else {
        if (recordController) {
            recordController.abort();
        }
    }
};

function saveRecording() {
    if (recordedChunks.length === 0) {
        stopAndDiscardRecording();
        return;
    }

    const blob = new Blob(recordedChunks, { type: recordMimeType || 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Gravacao_Radio_${new Date().getTime()}.${recordExtension}`;
    a.click();
    URL.revokeObjectURL(url);
    
    window.showGenericToast('Concluído', `Gravação salva no formato .${recordExtension}`, 'bi-check-circle-fill', '#4ade80');
    stopAndDiscardRecording();
}

function stopAndDiscardRecording() {
    isRecording = false;
    recordedChunks = [];
    recordController = null;
    const recordBtn = document.getElementById('recordBtn');
    if(recordBtn) recordBtn.innerHTML = '<i class="bi bi-record-circle"></i> Gravar Áudio';
}

// ==========================================
// FUNÇÃO RELAXAR (ÁUDIO 3D)
// ==========================================
window.toggleRelaxMode = function() {
    window.isRelaxModeOn = !window.isRelaxModeOn;
    const btn = document.getElementById('relaxBtn');
    
    if (window.isRelaxModeOn) {
        btn.style.color = '#3b82f6'; 
        window.showGenericToast('Dolby Áudio', 'Dolby Atmos ativado.', 'bi bi-headphones', '#3b82f6');
    } else {
        btn.style.color = '#ef4444'; 
        window.showGenericToast('Dolby Áudio', 'Dolby Atmos desativado.', 'bi bi-headphones', '#ef4444');
    }
    
    if (visualizerActive) routeAudioGraph();
    
    const dropdown = document.getElementById('headerDropdown');
    if(dropdown) dropdown.classList.remove('show');
};

// ==========================================
// SISTEMA DE FAVORITOS (CURTIDAS) COM PROTEÇÃO DE CACHE
// ==========================================
let favoritesList = [];
let dislikesList = [];

try {
    favoritesList = JSON.parse(localStorage.getItem('radioFavorites')) || [];
    if (!Array.isArray(favoritesList)) favoritesList = [];
} catch(e) { favoritesList = []; }

try {
    dislikesList = JSON.parse(localStorage.getItem('radioDislikes')) || [];
    if (!Array.isArray(dislikesList)) dislikesList = [];
} catch(e) { dislikesList = []; }

function savePreferences() {
    localStorage.setItem('radioFavorites', JSON.stringify(favoritesList));
    localStorage.setItem('radioDislikes', JSON.stringify(dislikesList));
    checkFavoritesMenu();
}

function checkFavoritesMenu() {
    const favBtn = document.getElementById('openFavoritesBtn');
    if (favBtn) favBtn.style.display = favoritesList.length > 0 ? 'flex' : 'none';
}

function updateLikeDislikeUI() {
    if (!currentTrackMetadata || isDefaultTrack(currentTrackMetadata.title, currentTrackMetadata.artist, stations[currentStationIndex].name)) {
        ['mainLikeBtn', 'stickyLikeBtn'].forEach(id => {
            const el = document.getElementById(id);
            if(el) { el.classList.remove('bi-hand-thumbs-up-fill'); el.classList.add('bi-hand-thumbs-up'); el.style.color = ''; }
        });
        ['mainDislikeBtn', 'stickyDislikeBtn'].forEach(id => {
            const el = document.getElementById(id);
            if(el) { el.classList.remove('bi-hand-thumbs-down-fill'); el.classList.add('bi-hand-thumbs-down'); el.style.color = ''; }
        });
        return;
    }

    const trackId = `${currentTrackMetadata.title} - ${currentTrackMetadata.artist}`.toLowerCase();
    const isLiked = favoritesList.some(t => t.id === trackId);
    const isDisliked = dislikesList.some(t => t.id === trackId);

    ['mainLikeBtn', 'stickyLikeBtn'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            if(isLiked) { el.classList.remove('bi-hand-thumbs-up'); el.classList.add('bi-hand-thumbs-up-fill'); el.style.color = '#4ade80'; }
            else { el.classList.remove('bi-hand-thumbs-up-fill'); el.classList.add('bi-hand-thumbs-up'); el.style.color = ''; }
        }
    });

    ['mainDislikeBtn', 'stickyDislikeBtn'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            if(isDisliked) { el.classList.remove('bi-hand-thumbs-down'); el.classList.add('bi-hand-thumbs-down-fill'); el.style.color = '#f43f5e'; }
            else { el.classList.remove('bi-hand-thumbs-down-fill'); el.classList.add('bi-hand-thumbs-down'); el.style.color = ''; }
        }
    });
}

function handlePreferenceToggle(type, e) {
    e.stopPropagation();
    if (!currentTrackMetadata || isDefaultTrack(currentTrackMetadata.title, currentTrackMetadata.artist, stations[currentStationIndex].name)) return;

    const trackId = `${currentTrackMetadata.title} - ${currentTrackMetadata.artist}`.toLowerCase();
    const trackData = {
        id: trackId,
        title: currentTrackMetadata.title,
        artist: currentTrackMetadata.artist,
        art: currentTrackMetadata.art || stations[currentStationIndex].defaultArt
    };

    if (type === 'like') {
        const likedIndex = favoritesList.findIndex(t => t.id === trackId);
        if (likedIndex !== -1) {
            favoritesList.splice(likedIndex, 1);
            window.showGenericToast('Removido', 'Música removida dos favoritos.', 'bi-suit-heart', '#aaaaaa');
        } else {
            favoritesList.push(trackData);
            dislikesList = dislikesList.filter(t => t.id !== trackId);
            window.showGenericToast('Favorito', 'Você gostou desta música.', 'bi-suit-heart-fill', '#4ade80');
        }
    } else {
        const dislikedIndex = dislikesList.findIndex(t => t.id === trackId);
        if (dislikedIndex !== -1) {
            dislikesList.splice(dislikedIndex, 1);
        } else {
            dislikesList.push(trackData);
            favoritesList = favoritesList.filter(t => t.id !== trackId);
            window.showGenericToast('Não Gostou', 'Não tocaremos mais isso.', 'bi-hand-thumbs-down-fill', '#f43f5e');
        }
    }

    savePreferences();
    updateLikeDislikeUI();
    
    const favModal = document.getElementById('favoritesModal');
    if (favModal && favModal.classList.contains('show')) {
        renderFavoritesModal();
    }
}

window.removeFavorite = function(trackId, e) {
    e.stopPropagation();
    const index = favoritesList.findIndex(t => t.id === trackId);
    if (index !== -1) {
        favoritesList.splice(index, 1);
        savePreferences();
        updateLikeDislikeUI();
        renderFavoritesModal();
        window.showGenericToast('Removido', 'Música removida dos favoritos.', 'bi-trash3-fill', '#f43f5e');
    }
};

const mainLikeBtn = document.getElementById('mainLikeBtn');
const stickyLikeBtn = document.getElementById('stickyLikeBtn');
const mainDislikeBtn = document.getElementById('mainDislikeBtn');
const stickyDislikeBtn = document.getElementById('stickyDislikeBtn');

if(mainLikeBtn) mainLikeBtn.addEventListener('click', (e) => handlePreferenceToggle('like', e));
if(stickyLikeBtn) stickyLikeBtn.addEventListener('click', (e) => handlePreferenceToggle('like', e));
if(mainDislikeBtn) mainDislikeBtn.addEventListener('click', (e) => handlePreferenceToggle('dislike', e));
if(stickyDislikeBtn) stickyDislikeBtn.addEventListener('click', (e) => handlePreferenceToggle('dislike', e));

// Modal Favoritos
const openFavoritesBtn = document.getElementById('openFavoritesBtn');
const closeFavoritesBtn = document.getElementById('closeFavoritesBtn');

if(openFavoritesBtn) {
    openFavoritesBtn.addEventListener('click', () => {
        renderFavoritesModal();
        const fModal = document.getElementById('favoritesModal');
        if(fModal) fModal.classList.add('show');
        const hDropdown = document.getElementById('headerDropdown');
        if(hDropdown) hDropdown.classList.remove('show');
    });
}
if(closeFavoritesBtn) {
    closeFavoritesBtn.addEventListener('click', () => {
        const fModal = document.getElementById('favoritesModal');
        if(fModal) fModal.classList.remove('show');
    });
}

async function renderFavoritesModal() {
    const grid = document.getElementById('favoritesGrid');
    if(!grid) return;
    
    if (favoritesList.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 30px 10px; color: rgba(255,255,255,0.6); font-size: 14px; background: rgba(255,255,255,0.05); border-radius: 12px;"><i class="bi bi-heartbreak" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>Você ainda não favoritou nenhuma música.</div>`;
        return;
    }

    const favData = await Promise.all(favoritesList.map(async (song, index) => {
        let preview = null; let link = '#'; let art = song.art;
        const itunes = await fetchItunesData(song.title, song.artist);
        if (itunes && itunes.art) { art = itunes.art; preview = itunes.preview; link = itunes.link || '#'; }
        return { ...song, art, preview, link, safeId: `fav_${index}` };
    }));

    grid.innerHTML = favData.map((data) => `
        <div class="history-card" style="opacity: 1;" id="card_${data.safeId}" onclick="window.toggleHistoryActions('${data.safeId}')">
            <div class="history-cover">
                <div class="skeleton-loader"></div>
                <div class="history-cover-img loaded" id="img_${data.safeId}" style="background-image: url('${data.art}')"></div>
                
                <button class="remove-fav-btn" onclick="window.removeFavorite('${data.id}', event)" title="Remover dos favoritos">
                    <i class="bi bi-trash3-fill"></i>
                </button>

                <div class="history-overlay">
                    <button class="preview-btn ${!data.preview ? 'no-preview' : ''}" ${!data.preview ? 'disabled title="Preview indisponível"' : `onclick="event.stopPropagation(); window.togglePreview('${data.preview}', '${data.safeId}')"`}>
                        <svg width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="18"></circle><circle cx="21" cy="21" r="18" class="progress-circle" id="circle_${data.safeId}"></circle></svg>
                        <i class="bi bi-play-fill icon" id="icon_${data.safeId}"></i>
                    </button>
                    <a href="${data.link}" target="_blank" class="itunes-btn ${data.link === '#' ? 'no-preview' : ''}" ${data.link === '#' ? 'onclick="event.stopPropagation(); return false;"' : 'onclick="event.stopPropagation();" title="Abrir no iTunes"'}><i class="bi bi-apple"></i></a>
                </div>
            </div>
            <div class="history-info">
                <div class="history-title" title="${data.title}">${data.title}</div>
                <div class="history-artist" title="${data.artist}">${data.artist}</div>
            </div>
        </div>
    `).join('');
}

// ==========================================
// SLEEP TIMER
// ==========================================
function resetSleepAutoClose() {
    clearTimeout(sleepAutoCloseTimeout);
    sleepAutoCloseTimeout = setTimeout(() => {
        const slpModal = document.getElementById('sleepModal');
        if (slpModal && slpModal.classList.contains('show')) slpModal.classList.remove('show');
    }, 6000); 
}

const sleepModalEl = document.getElementById('sleepModal');
if (sleepModalEl) {
    sleepModalEl.addEventListener('mousemove', resetSleepAutoClose);
    sleepModalEl.addEventListener('touchstart', resetSleepAutoClose, {passive: true});
}

window.openSleepModal = function() {
    document.getElementById('sleepModal').classList.add('show');
    document.getElementById('headerDropdown').classList.remove('show');
    resetSleepAutoClose();
};

const closeSleepBtn = document.getElementById('closeSleepBtn');
if(closeSleepBtn) closeSleepBtn.addEventListener('click', () => { document.getElementById('sleepModal').classList.remove('show'); });

window.setSleepTimer = function(minutes) {
    clearTimeout(sleepTimerTimeout);
    document.getElementById('sleepModal').classList.remove('show');

    if(minutes === 0) {
        window.showGenericToast('Modo Soneca', 'O temporizador foi desativado.', 'bi-moon-stars', '#aaaaaa');
        return;
    }

    const ms = minutes * 60000;
    sleepTimerTimeout = setTimeout(() => {
        if (isPlaying) {
            window.showGenericToast('Modo Soneca', 'A transmissão foi pausada com sucesso.', 'bi-moon-stars-fill', '#3b82f6');
            toggleLivePlay(); 
        }
    }, ms);
    
    window.showGenericToast('Modo Soneca', `A rádio será pausada em ${minutes} minutos.`, 'bi-clock-fill', '#3b82f6');
};

// ==========================================
// DROPDOWNS E CLICK OUTSIDE
// ==========================================
const headerMenuBtn = document.getElementById('headerMenuBtn');
const headerDropdown = document.getElementById('headerDropdown');
let dropdownTimeout;
let historyActionTimeout;
let activeActionCardId = null;

function resetDropdownTimeout() {
    clearTimeout(dropdownTimeout);
    dropdownTimeout = setTimeout(() => {
        if(headerDropdown) headerDropdown.classList.remove('show');
    }, 6000); 
}

if(headerMenuBtn) {
    headerMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        headerDropdown.classList.toggle('show');
        resetDropdownTimeout();
    });
}

if(headerDropdown) {
    headerDropdown.addEventListener('mousemove', resetDropdownTimeout);
    headerDropdown.addEventListener('touchstart', resetDropdownTimeout, {passive: true});
}

window.toggleHistoryActions = function(safeId) {
    const card = document.getElementById(`card_${safeId}`);
    if (!card) return;

    if (card.classList.contains('show-actions')) {
        card.classList.remove('show-actions');
        clearTimeout(historyActionTimeout);
        activeActionCardId = null;
        return;
    }

    if (activeActionCardId) {
        const prevCard = document.getElementById(`card_${activeActionCardId}`);
        if (prevCard) prevCard.classList.remove('show-actions');
    }

    card.classList.add('show-actions');
    activeActionCardId = safeId;
    clearTimeout(historyActionTimeout);

    historyActionTimeout = setTimeout(() => {
        card.classList.remove('show-actions');
        activeActionCardId = null;
    }, 5000);
}

document.addEventListener('click', (e) => {
    if (headerDropdown && !headerDropdown.contains(e.target)) {
        if (!headerMenuBtn || (!headerMenuBtn.contains(e.target) && e.target !== headerMenuBtn)) {
            headerDropdown.classList.remove('show');
        }
    }
    if (circularArtWrapper && !circularArtWrapper.contains(e.target)) {
        circularArtWrapper.classList.remove('show-share');
        clearTimeout(shareTimeout);
    }
    if (activeActionCardId) {
        const card = document.getElementById(`card_${activeActionCardId}`);
        if (card && !card.contains(e.target)) {
            card.classList.remove('show-actions');
            clearTimeout(historyActionTimeout);
            activeActionCardId = null;
        }
    }
});

// ==========================================
// COLOR THIEF, THEME E NEON GENERATOR
// ==========================================
function getNeonColor(r, g, b) {
    let max = Math.max(r, g, b);
    if (max === 0) return [0, 255, 255]; 
    let factor = 255 / max;
    return [
        Math.min(255, Math.floor(r * factor)),
        Math.min(255, Math.floor(g * factor)),
        Math.min(255, Math.floor(b * factor))
    ];
}

function updateThemeColor(imageUrl) {
    if (!imageUrl) return;
    
    const img = new Image();
    img.crossOrigin = 'Anonymous'; 
    img.onload = function() {
        try {
            const colorThief = new ColorThief();
            const color = colorThief.getColor(img);
            let palette = colorThief.getPalette(img, 3);
            
            // Garantir que as cores fiquem ultra vibrantes (NEON)
            if (palette && palette.length > 0) {
                window.currentVisualizerPalette = palette.map(c => getNeonColor(c[0], c[1], c[2]));
            } else if (color) {
                let neonC = getNeonColor(color[0], color[1], color[2]);
                window.currentVisualizerPalette = [neonC, neonC, neonC];
            }

            if (color && color.length >= 3) {
                const neonBase = getNeonColor(color[0], color[1], color[2]);
                window.currentVisualizerColor = neonBase;
                const hexColor = `#${neonBase[0].toString(16).padStart(2, '0')}${neonBase[1].toString(16).padStart(2, '0')}${neonBase[2].toString(16).padStart(2, '0')}`;
                
                const themeMeta = document.querySelector('meta[name="theme-color"]');
                if(themeMeta) themeMeta.setAttribute('content', hexColor);

                // Aplica a cor no brilho do texto do tempo
                const trackTimeDisplay = document.getElementById('trackTimeDisplay');
                if (trackTimeDisplay) {
                    trackTimeDisplay.style.setProperty('--neon-glow', `rgba(${neonBase[0]}, ${neonBase[1]}, ${neonBase[2]}, 0.8)`);
                }
            }
        } catch (e) {
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#111111');
            window.currentVisualizerColor = [74, 222, 128]; 
            window.currentVisualizerPalette = [[74, 222, 128], [59, 130, 246]];
        }
    };
    img.onerror = function() {
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#111111');
        window.currentVisualizerColor = [74, 222, 128]; 
        window.currentVisualizerPalette = [[74, 222, 128], [59, 130, 246]];
    };
    
    let finalUrl = imageUrl;
    if (finalUrl.startsWith('http') && !finalUrl.includes('images.weserv.nl')) {
        finalUrl = CORS_PROXY + encodeURIComponent(finalUrl);
    }
    img.src = finalUrl;
}

// ==========================================
// LETRAS (LRCLIB)
// ==========================================
const lyricsModal = document.getElementById('lyricsModal');
const openLyricsBtn = document.getElementById('openLyricsBtn');
const closeLyricsBtn = document.getElementById('closeLyricsBtn');
const lyricsContent = document.getElementById('lyricsContent');
const lyricsTrackInfo = document.getElementById('lyricsTrackInfo');

async function checkAndFetchLyrics(title, artist) {
    if (!openLyricsBtn) return;
    
    openLyricsBtn.style.opacity = '0.4';
    openLyricsBtn.style.pointerEvents = 'none';
    openLyricsBtn.style.cursor = 'not-allowed';
    
    if (!title || isDefaultTrack(title, artist, stations[currentStationIndex].name)) return;

    const lyricsHtml = await fetchLyrics(title, artist);
    
    if (lyricsHtml) {
        openLyricsBtn.style.opacity = '0.9';
        openLyricsBtn.style.pointerEvents = 'auto';
        openLyricsBtn.style.cursor = 'pointer';
    }
}

if(openLyricsBtn) {
    openLyricsBtn.addEventListener('click', async () => {
        lyricsModal.classList.add('show');
        
        const title = currentTrackMetadata.title;
        const artist = currentTrackMetadata.artist;

        if (!title || isDefaultTrack(title, artist, stations[currentStationIndex].name)) {
            lyricsTrackInfo.innerHTML = `<h3>Sem música</h3><p>Aguarde a transmissão</p>`;
            lyricsContent.innerHTML = `<div style="padding-top: 40px; opacity: 0.6;">Sintonize uma rádio para ver as letras.</div>`;
            return;
        }

        lyricsTrackInfo.innerHTML = `<h3>${title}</h3><p>${artist}</p>`;
        lyricsContent.innerHTML = `<div class="lyrics-loading"><div class="spinner"></div>Buscando letras...</div>`;

        const lyricsHtml = await fetchLyrics(title, artist);

        if (lyricsHtml) {
            const cleanLyrics = lyricsHtml.replace(/\[\d{2}:\d{2}\.\d{1,3}\]\s*/g, '');
            lyricsContent.innerHTML = cleanLyrics;
        } else {
            lyricsContent.innerHTML = `<div style="padding-top: 40px; opacity: 0.6;"><i class="bi bi-music-note" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>Letras não encontradas para esta faixa.</div>`;
        }
    });
}

if(closeLyricsBtn) closeLyricsBtn.addEventListener('click', () => lyricsModal.classList.remove('show'));

// ==========================================
// FILTRO E HISTÓRICO
// ==========================================
const invalidTexts = ['the hits & the viber 98.fm', 'the hitz channel power 181', 'jingle', 'vinheta', 'energy brasil', '98.fm'];

function isTrackAllowed(title, artist) {
    if (!title || !artist) return false;
    const str = `${title} ${artist}`.toLowerCase();
    return !invalidTexts.some(kw => str.includes(kw.toLowerCase()));
}

const HISTORY_TTL = 24 * 60 * 60 * 1000; 

function cleanAndGetLocalHistory(stationId) {
    const key = `radioLocalHistory_${stationId}`;
    let history = [];
    try { history = JSON.parse(localStorage.getItem(key)) || []; } catch(e) { history = []; }
    
    const now = Date.now();
    const validHistory = history.filter(item => (now - (item.timestamp * 1000)) < HISTORY_TTL);
    
    if (validHistory.length !== history.length) localStorage.setItem(key, JSON.stringify(validHistory));
    return validHistory;
}

function addTrackToLocalHistory(stationId, songData) {
    let history = cleanAndGetLocalHistory(stationId);
    
    const titleNormalized = songData.title.toLowerCase().trim();
    
    const exists = history.some(item => item.title.toLowerCase().trim() === titleNormalized);
    if (exists) { history = history.filter(item => item.title.toLowerCase().trim() !== titleNormalized); }

    history.unshift({
        title: songData.title,
        artist: songData.artist,
        art: songData.art || '',
        timestamp: Math.floor(Date.now() / 1000)
    });

    if (history.length > 30) history = history.slice(0, 30);
    localStorage.setItem(`radioLocalHistory_${stationId}`, JSON.stringify(history));
    return history;
}

let savedStation = localStorage.getItem('lastStationIndex');
let currentStationIndex = savedStation ? parseInt(savedStation, 10) : 0;
let firstHistoryRender = true;

if (isNaN(currentStationIndex) || currentStationIndex < 0 || currentStationIndex >= stations.length) currentStationIndex = 0;

let isPlaying = false;
let currentTrackId = ""; 
let currentTrackMetadata = { title: 'Conectando...', artist: 'Aguarde', art: '', bgArt: '' }; 

const dotCssMap = { high: 'excelente', mid: 'padrao', low: 'economica' };

let currentQualityMode = localStorage.getItem('radioQualityMode') || 'auto'; 
let activeQualityLevel = 'mid'; 

let globalVolume = 1.0; 
let wasPlayingBeforePreview = false;
let isOfflineStatus = false;
let isBufferingStatus = false;
let isNetworkOffline = !navigator.onLine;

let reconnectTimeout = null;
let offlineTimeout = null;
let isSwitchingQuality = false;
let isPlayerStarting = false;

// ==========================================
// EQUALIZADOR DSP 3D & WAVES CIRCULARES NEON (AMBIENTE + Z-TREBLE PRESET)
// ==========================================
let audioCtx, analyser, source;
let visualizerActive = false;

let splitter, merger, delayR;
let eqBass, eqMid, eqTreble;
let agcNode, makeupGain, limiterNode;

const canvas = document.getElementById('visualizerCanvas');
const ctx = canvas.getContext('2d');
let audioDataArray; 

function stopAndClearAudio() {
    try {
        if (!audioPlayer.paused) audioPlayer.pause();
        if (audioCtx && audioCtx.state === 'running') {
            audioCtx.suspend().catch(()=>{});
        }
    } catch(e) {}
}

function initVisualizer() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        audioCtx = new AudioContext();
        
        try {
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256; 
            analyser.smoothingTimeConstant = 0.85; 
            
            audioDataArray = new Uint8Array(analyser.frequencyBinCount);
            source = audioCtx.createMediaElementSource(audioPlayer);

            splitter = audioCtx.createChannelSplitter(2);
            merger = audioCtx.createChannelMerger(2);
            
            delayR = audioCtx.createDelay();
            delayR.delayTime.value = 0.015; 

            // EQUALIZADOR AMBIENTE + Z-TREBLE
            eqBass = audioCtx.createBiquadFilter();
            eqBass.type = 'lowshelf';
            eqBass.frequency.value = 65; // Sub-graves e batidas profundas que preenchem o ambiente
            eqBass.gain.value = 4.0; // Ganho presente mas macio, que não agride caixas pequenas

            eqMid = audioCtx.createBiquadFilter();
            eqMid.type = 'peaking';
            eqMid.frequency.value = 1500; // Proteção para clareza da voz e instrumentos médios
            eqMid.Q.value = 1.0;
            eqMid.gain.value = 1.5; // Leve realce para a voz não ser ofuscada

            eqTreble = audioCtx.createBiquadFilter();
            eqTreble.type = 'highshelf';
            eqTreble.frequency.value = 12000; // Z-Treble (Ar e brilho cristalino HD)
            eqTreble.gain.value = 4.5; // Alta definição sem rasgar em fones Bluetooth

            // COMPRESSOR AGC (NIVELADOR SUAVE - ANTI-PUMPING)
            // A chave aqui é um ratio menor e um ataque/release mais lentos
            // Isso acompanha o volume geral da música e NÃO abaixa no soco de cada bumbo/batida
            agcNode = audioCtx.createDynamicsCompressor();
            agcNode.threshold.value = -30; // Analisa boa parte do sinal
            agcNode.knee.value = 12; // Curva suave
            agcNode.ratio.value = 4.0; // Proporção equilibrada, antes era agressivo (15.0)
            agcNode.attack.value = 0.3; // Lento o suficiente para deixar o impacto da batida passar sem afundar a voz
            agcNode.release.value = 1.2; // Volta do volume de forma natural (não pula)

            // COMPENSAÇÃO DE GANHO DO COMPRESSOR
            makeupGain = audioCtx.createGain();
            makeupGain.gain.value = 4.5; // Compensa a perda de compressão, mantendo faixas niveladas e cheias

            // LIMITER DE PROTEÇÃO (PROTEGE FONES, JBLs E NOTEBOOKS)
            limiterNode = audioCtx.createDynamicsCompressor();
            limiterNode.threshold.value = -1.5; // Limite teto para não estourar/clipar (distorção)
            limiterNode.knee.value = 0.0; 
            limiterNode.ratio.value = 20.0; // Brickwall duro de segurança
            limiterNode.attack.value = 0.002; // Ataque instantâneo no teto
            limiterNode.release.value = 0.1; 

            visualizerActive = true;
        } catch (e) { 
            visualizerActive = false; 
        }
        drawVisualizer();
    }
    
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(e => {});
    if (visualizerActive) routeAudioGraph();
}

function routeAudioGraph() {
    if (!source || !visualizerActive) return;
    
    const station = stations[currentStationIndex];
    const useEq = (station.equalizador === true || String(station.equalizador).toLowerCase() === "true");
    
    try {
        source.disconnect();
        splitter.disconnect();
        merger.disconnect();
        delayR.disconnect();
        eqBass.disconnect();
        eqMid.disconnect();
        eqTreble.disconnect();
        agcNode.disconnect();
        makeupGain.disconnect();
        limiterNode.disconnect();
        analyser.disconnect();
    } catch(e) {}

    if (useEq) {
        source.connect(splitter);
        splitter.connect(merger, 0, 0);
        
        if (window.isRelaxModeOn) {
            splitter.connect(delayR, 1);
            delayR.connect(merger, 0, 1);
        } else {
            splitter.connect(merger, 1, 1);
        }
        
        merger.connect(eqBass);
        eqBass.connect(eqMid);
        eqMid.connect(eqTreble);
        
        eqTreble.connect(agcNode);
        agcNode.connect(makeupGain);
        
        makeupGain.connect(limiterNode);
        limiterNode.connect(analyser); 
        analyser.connect(audioCtx.destination);
    } else {
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    }
}

// ==========================================
// DESENHO: PROGRESSO SUAVE DE TEMPO E ONDAS
// ==========================================
function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    
    const ring = document.getElementById('visualizerRing');
    const trackTimeDisplay = document.getElementById('trackTimeDisplay');
    const station = stations[currentStationIndex];
    const allowVisualizer = (station.visualizer === true || String(station.visualizer).toLowerCase() === "true");

    let isActivePlayer = isPlaying && !isBufferingStatus && !isOfflineStatus && !isSwitchingQuality;

    if (!allowVisualizer) {
        canvas.style.opacity = '0'; 
        ring.style.opacity = '0'; 
        ring.classList.remove('fallback-pulse');
        if (trackTimeDisplay) trackTimeDisplay.style.opacity = '0';
        return;
    }

    if (!visualizerActive) {
        canvas.style.opacity = '0'; 
        ring.style.opacity = '0.8'; 
        ring.classList.add('fallback-pulse'); 
        if (trackTimeDisplay) trackTimeDisplay.style.opacity = '0';
        return;
    }

    canvas.style.opacity = '1'; 
    ring.style.opacity = '0'; 
    ring.classList.remove('fallback-pulse');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (isActivePlayer && audioDataArray) {
        analyser.getByteFrequencyData(audioDataArray);
    } else if (audioDataArray) {
        audioDataArray.fill(0);
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const baseRadius = 100; 
    const progressRadius = baseRadius + 14; 
    const vizStartRadius = progressRadius + 15;
    const maxBarHeight = 45; 

    let palette = window.currentVisualizerPalette || [[74, 222, 128], [59, 130, 246]];
    let color1 = palette[0] || [74, 222, 128];
    let color2 = palette[1] || color1;

    // Cálculo Suave de Tempo usando milissegundos
    let nowMs = Date.now();
    let simulatedElapsed = window.currentSongElapsed;
    
    if (isActivePlayer && window.currentSongDuration > 0 && window.lastSongUpdateTimeRefMs) {
        simulatedElapsed += ((nowMs - window.lastSongUpdateTimeRefMs) / 1000);
    }
    
    if (window.currentSongDuration > 0 && simulatedElapsed > window.currentSongDuration) {
        simulatedElapsed = window.currentSongDuration;
    }

    let progressRatio = 0;
    if (window.currentSongDuration > 0) {
        progressRatio = simulatedElapsed / window.currentSongDuration;
        if (trackTimeDisplay && (isActivePlayer || !audioPlayer.paused)) {
            let m = Math.floor(simulatedElapsed / 60);
            let s = Math.floor(simulatedElapsed % 60).toString().padStart(2, '0');
            trackTimeDisplay.innerText = `${m}:${s}`;
            trackTimeDisplay.style.opacity = '1';
        }
    } else {
        if (trackTimeDisplay) trackTimeDisplay.style.opacity = '0';
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, progressRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.05)`;
    ctx.lineWidth = 4;
    ctx.stroke();

    if (progressRatio > 0) {
        let startAngle = -Math.PI / 2;
        let endAngle = startAngle + (Math.PI * 2 * progressRatio);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, progressRadius, startAngle, endAngle);
        ctx.strokeStyle = `rgba(${color2[0]}, ${color2[1]}, ${color2[2]}, 1)`;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(${color2[0]}, ${color2[1]}, ${color2[2]}, 0.8)`;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    const timeOffset = Date.now() * 0.001;

    function drawElectricWave(layerIndex, offsetAngle, amplitudeScale, isSharp) {
        const numPoints = 64; 
        const angleStep = (Math.PI * 2) / numPoints;
        const points = [];

        let ratio = layerIndex / 2; 
        let r = Math.floor(color1[0] * (1 - ratio) + color2[0] * ratio);
        let g = Math.floor(color1[1] * (1 - ratio) + color2[1] * ratio);
        let b = Math.floor(color1[2] * (1 - ratio) + color2[2] * ratio);

        for (let i = 0; i < numPoints; i++) {
            let dataIdx = i <= numPoints / 2 ? i : numPoints - i;
            let mappedIdx = Math.floor((dataIdx / (numPoints / 2)) * (audioDataArray.length * 0.6));
            let val = audioDataArray[mappedIdx] || 0;

            let prevIdx = Math.max(0, mappedIdx - 1);
            let nextIdx = Math.min(audioDataArray.length - 1, mappedIdx + 1);
            let smoothedVal = (audioDataArray[prevIdx] + val + audioDataArray[nextIdx]) / 3;

            let currentRadius = vizStartRadius + (smoothedVal / 255) * maxBarHeight * amplitudeScale;

            if (isSharp && smoothedVal > 50) {
                currentRadius += (Math.random() - 0.5) * (smoothedVal * 0.2);
            }

            let angle = i * angleStep + offsetAngle;
            points.push({
                x: centerX + Math.cos(angle) * currentRadius,
                y: centerY + Math.sin(angle) * currentRadius
            });
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length; i++) {
            let pNext = points[(i + 1) % points.length];
            if (isSharp) {
                ctx.lineTo(pNext.x, pNext.y);
            } else {
                let pNextNext = points[(i + 2) % points.length];
                let xc = (pNext.x + pNextNext.x) / 2;
                let yc = (pNext.y + pNextNext.y) / 2;
                ctx.quadraticCurveTo(pNext.x, pNext.y, xc, yc);
            }
        }
        ctx.closePath();

        ctx.lineWidth = isSharp ? 1.5 : 2.5;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
        ctx.shadowBlur = isSharp ? 25 : 15;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 1)`;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawElectricWave(0, timeOffset * 0.5, 0.6, false);
    drawElectricWave(1, -timeOffset * 0.8, 1.0, true);
    drawElectricWave(2, timeOffset * 1.2, 0.8, false);
}

// ==========================================
// MODAIS SECUNDÁRIOS 
// ==========================================
let autoCloseTimeout;
let stationsAutoCloseTimeout;

function resetMenuAutoClose() {
    clearTimeout(autoCloseTimeout);
    autoCloseTimeout = setTimeout(() => {
        document.getElementById('qualityModal').classList.remove('show');
        const p = document.getElementById('stickyQualityPopup');
        if(p) p.classList.remove('show');
    }, 5000); 
}
document.getElementById('qualityModal').addEventListener('mousemove', resetMenuAutoClose);
document.getElementById('qualityModal').addEventListener('touchstart', resetMenuAutoClose, {passive: true});

function resetStationsAutoClose() {
    clearTimeout(stationsAutoCloseTimeout);
    stationsAutoCloseTimeout = setTimeout(() => {
        const stModal = document.getElementById('stationsModal');
        if (stModal && stModal.classList.contains('show')) stModal.classList.remove('show');
    }, 10000); 
}

const stationsModalEl = document.getElementById('stationsModal');
if(stationsModalEl) {
    stationsModalEl.addEventListener('mousemove', resetStationsAutoClose);
    stationsModalEl.addEventListener('touchstart', resetStationsAutoClose, {passive: true});
    stationsModalEl.addEventListener('scroll', resetStationsAutoClose, {passive: true});
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentTrackMetadata && currentTrackMetadata.title) updateUIText(currentTrackMetadata);
    }, 150);
});

// ==========================================
// SISTEMA DE QUALIDADE DE ÁUDIO & REDE OTIMIZADO
// ==========================================
window.openQualityModal = function() { renderQualityMenu(); document.getElementById('qualityModal').classList.add('show'); resetMenuAutoClose(); }

const closeQualityBtn = document.getElementById('closeQualityBtn');
if(closeQualityBtn) closeQualityBtn.addEventListener('click', () => { document.getElementById('qualityModal').classList.remove('show'); });

const stickyQualityBtn = document.getElementById('stickyQualityBtn');
const stickyQualityPopup = document.getElementById('stickyQualityPopup');

if(stickyQualityBtn) {
    stickyQualityBtn.addEventListener('click', (e) => { e.stopPropagation(); renderQualityMenu(); stickyQualityPopup.classList.toggle('show'); resetMenuAutoClose(); });
}

window.selectQualityMode = function(mode) {
    currentQualityMode = mode;
    localStorage.setItem('radioQualityMode', mode); 
    
    if (mode === 'auto') {
        window.showGenericToast('Qualidade Automática', 'Ajustando de acordo com sua conexão.', 'bi-gear', '#ffffff');
        evaluateNetworkAndSetQuality();
    } else {
        const modeNames = { 'high': 'Excelente', 'mid': 'Padrão', 'low': 'Econômica' };
        window.showGenericToast('Qualidade Manual', `Fixada em ${modeNames[mode]}.`, 'bi-earbuds', '#3b82f6');
        applyQualityStream(mode); 
    }
    
    renderQualityMenu();
    const qModal = document.getElementById('qualityModal');
    if(qModal) qModal.classList.remove('show');
    if(stickyQualityPopup) stickyQualityPopup.classList.remove('show');
};

function evaluateNetworkAndSetQuality() {
    if (currentQualityMode !== 'auto') return;

    const station = stations[currentStationIndex];
    const available = ['high', 'mid', 'low'].filter(k => station.streams[k] && station.streams[k].url);

    if (available.length <= 1) {
        if (available.length === 1 && activeQualityLevel !== available[0]) applyQualityStream(available[0]);
        else updateQualityBadges();
        return; 
    }

    let target = 'mid'; 

    if (navigator.connection) {
        const conn = navigator.connection;
        const type = conn.effectiveType || ''; 
        const downlink = conn.downlink || 10; 
        const rtt = conn.rtt || 0; 
        const saveData = conn.saveData || false; 

        if (saveData || type === 'slow-2g' || type === '2g' || downlink < 0.5 || rtt > 500) {
            target = 'low';
        } else if (type === '3g' || (downlink >= 0.5 && downlink < 2.0) || rtt > 150) {
            target = 'mid';
        } else {
            target = 'high';
        }
    }

    if (!station.streams[target] || !station.streams[target].url) {
         if (target === 'high') target = station.streams.mid?.url ? 'mid' : 'low';
         else if (target === 'low') target = station.streams.mid?.url ? 'mid' : 'high';
         else target = available[0];
    }

    if (activeQualityLevel !== target) {
        applyQualityStream(target);
    } else {
        updateQualityBadges();
    }
}

if (navigator.connection) {
    navigator.connection.addEventListener('change', evaluateNetworkAndSetQuality);
}

// LÓGICA OTIMIZADA E ANTI-PULO DE QUALIDADE AUTOMÁTICA
function monitorBufferRealTime() {
    if (!isPlaying || currentQualityMode !== 'auto' || isSwitchingQuality || autoQualityCooldown || isNetworkOffline) return;
    if (audioPlayer.buffered.length === 0) return;

    const bufferEnd = audioPlayer.buffered.end(audioPlayer.buffered.length - 1);
    const bufferHealth = bufferEnd - audioPlayer.currentTime;
    const station = stations[currentStationIndex];

    // Tolerância para queda: Somente cai se passar de 3 checks seguidos (3 segundos de internet ruim real)
    if (bufferHealth < 2.0) {
        lowBufferTicks++;
        if (lowBufferTicks >= 3) {
            let nextQuality = activeQualityLevel === 'high' ? 'mid' : 'low';
            if (!station.streams[nextQuality] || !station.streams[nextQuality].url) nextQuality = 'low';
            
            if (activeQualityLevel !== nextQuality && station.streams[nextQuality]?.url) {
                window.showGenericToast('Rede Instável', 'Reduzindo qualidade do áudio automaticamente.', 'bi-wifi-1', '#fceb05');
                applyQualityStream(nextQuality);
                autoQualityCooldown = true;
                setTimeout(() => { autoQualityCooldown = false; stableHighBufferTicks = 0; lowBufferTicks = 0; }, 45000); 
                return;
            }
        }
    } else {
        lowBufferTicks = 0;
    }

    // Tolerância para subida: Requer 30 segundos contínuos de buffer excelente (Evita subir e cair rápido demais)
    if (bufferHealth > 15) {
        stableHighBufferTicks++;
        if (stableHighBufferTicks >= 30) { 
            let nextQuality = activeQualityLevel === 'low' ? 'mid' : 'high';
            if (!station.streams[nextQuality] || !station.streams[nextQuality].url) nextQuality = 'high';
            
            if (activeQualityLevel !== nextQuality && station.streams[nextQuality]?.url) {
                window.showGenericToast('Rede Estável', 'Aumentando qualidade do áudio automaticamente.', 'bi-wifi', '#4ade80');
                applyQualityStream(nextQuality);
                autoQualityCooldown = true;
                setTimeout(() => { autoQualityCooldown = false; stableHighBufferTicks = 0; lowBufferTicks = 0; }, 60000); 
            }
            stableHighBufferTicks = 0;
        }
    } else {
        stableHighBufferTicks = 0;
    }
}
setInterval(monitorBufferRealTime, 1000);

function applyQualityStream(quality) {
    if (isSwitchingQuality) return; 
    const station = stations[currentStationIndex];
    if (!station.streams[quality] || !station.streams[quality].url) {
        quality = Object.keys(station.streams).find(k => station.streams[k] && station.streams[k].url) || 'mid';
    }
    
    const oldQuality = activeQualityLevel; 
    activeQualityLevel = quality; 
    updateQualityBadges();
    
    if (oldQuality === quality && audioPlayer.src && audioPlayer.src.includes(station.streams[quality].url)) return;

    if (isPlaying) {
        isSwitchingQuality = true; 
        setLoadingState(true); 
        setBufferingState(true); 
        
        if (!audioPlayer.paused) audioPlayer.pause();
        audioPlayer.src = getCurrentStreamUrl(); 
        audioPlayer.load();
        
        audioPlayer.play().then(() => {
            isSwitchingQuality = false; 
            setBufferingState(false);
            setLoadingState(false);
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        }).catch(e => {
            isSwitchingQuality = false;
            setBufferingState(false);
            setOfflineState(true);
            handleReconnect();
        });
    } else { 
        audioPlayer.src = getCurrentStreamUrl(); 
        audioPlayer.load();
    }
}

function updateQualityBadges() {
    const station = stations[currentStationIndex]; const currentStream = station.streams[activeQualityLevel]; const hasValidStream = currentStream && currentStream.url && currentStream.url.trim() !== "";
    [document.getElementById('mainSpeedBadge'), document.getElementById('stickySpeedBadge')].forEach(b => {
        if (b) { b.className = 'speed-badge'; 
            if (hasValidStream) { b.classList.add(`dot-${dotCssMap[activeQualityLevel] || 'padrao'}`); b.style.display = 'block'; } 
            else { b.style.display = 'none'; }
        }
    });
    renderQualityMenu();
}

function renderQualityMenu() {
    const station = stations[currentStationIndex]; const mainGrid = document.getElementById('qualityGrid');
    const qualities = [
        { id: 'high', name: 'Excelente', desc: station.streams.high ? station.streams.high.format : 'Melhor áudio' },
        { id: 'mid', name: 'Padrão', desc: station.streams.mid ? station.streams.mid.format : 'Equilíbrio' },
        { id: 'low', name: 'Econômica', desc: station.streams.low ? station.streams.low.format : 'Para lentidão' }
    ];
    const validQualities = qualities.filter(q => station.streams[q.id] && station.streams[q.id].url && station.streams[q.id].url.trim() !== "");
    const hasMultipleStreams = validQualities.length > 1;

    const mainQualityBtn = document.getElementById('mainQualityBtn');
    const stickyQualityBtnWrapper = document.getElementById('stickyQualityBtn');
    
    if (!hasMultipleStreams) {
        if(mainQualityBtn) { mainQualityBtn.style.opacity = '0.4'; mainQualityBtn.style.pointerEvents = 'none'; mainQualityBtn.style.cursor = 'not-allowed'; }
        if(stickyQualityBtnWrapper) { stickyQualityBtnWrapper.style.opacity = '0.4'; stickyQualityBtnWrapper.style.pointerEvents = 'none'; stickyQualityBtnWrapper.style.cursor = 'not-allowed'; }
    } else {
        if(mainQualityBtn) { mainQualityBtn.style.opacity = '1'; mainQualityBtn.style.pointerEvents = 'auto'; mainQualityBtn.style.cursor = 'pointer'; }
        if(stickyQualityBtnWrapper) { stickyQualityBtnWrapper.style.opacity = '1'; stickyQualityBtnWrapper.style.pointerEvents = 'auto'; stickyQualityBtnWrapper.style.cursor = 'pointer'; }
    }

    let mainHtml = ''; let stickyHtml = '';
    
    if (hasMultipleStreams) {
        mainHtml += `<div class="quality-option ${currentQualityMode === 'auto' ? 'selected' : ''}" onclick="window.selectQualityMode('auto')"><i class="bi bi-gear"></i><div class="quality-info"><div class="quality-title">Automático</div><div class="quality-desc">Ajuste dinâmico em Tempo Real</div></div>${currentQualityMode === 'auto' ? `<div class="quality-indicator-dot dot-auto"></div>` : ''}</div>`;
        stickyHtml += `<button class="sticky-q-btn ${currentQualityMode === 'auto' ? 'selected' : ''}" onclick="window.selectQualityMode('auto')"><div class="q-icon-text"><i class="bi bi-gear"></i> Auto</div>${currentQualityMode === 'auto' ? `<div class="dot dot-auto"></div>` : ''}</button>`;
    }

    validQualities.forEach(q => {
        const isActiveStream = (activeQualityLevel === q.id); 
        const isManualSelected = (currentQualityMode === q.id) || (currentQualityMode === 'auto' && !hasMultipleStreams);
        
        mainHtml += `<div class="quality-option ${isManualSelected ? 'selected' : ''}" onclick="window.selectQualityMode('${q.id}')"><i class="bi bi-earbuds"></i><div class="quality-info"><div class="quality-title">${q.name}</div><div class="quality-desc">${q.desc}</div></div>${isActiveStream ? `<div class="quality-indicator-dot dot-${dotCssMap[q.id]}"></div>` : ''}</div>`;
        stickyHtml += `<button class="sticky-q-btn ${isManualSelected ? 'selected' : ''}" onclick="window.selectQualityMode('${q.id}')"><div class="q-icon-text"><i class="bi bi-earbuds"></i> ${q.name}</div>${isActiveStream ? `<div class="dot dot-${dotCssMap[q.id]}"></div>` : ''}</button>`;
    });
    
    if(mainGrid) mainGrid.innerHTML = mainHtml; 
    if(stickyQualityPopup) stickyQualityPopup.innerHTML = stickyHtml;
}

// ==========================================
// SISTEMA DE REPRODUÇÃO, RECONEXÃO E CACHE 
// ==========================================
function getCurrentStreamUrl(preventCache = false) {
    const station = stations[currentStationIndex];
    let url = '';
    if (station.streams[activeQualityLevel] && station.streams[activeQualityLevel].url) {
        url = station.streams[activeQualityLevel].url;
    } else {
        const availableKey = Object.keys(station.streams).find(k => station.streams[k] && station.streams[k].url);
        url = availableKey ? station.streams[availableKey].url : '';
    }
    
    if (preventCache && url) {
        url += (url.includes('?') ? '&' : '?') + 'nocache=' + new Date().getTime();
    }
    return url;
}

function setLoadingState(isLoading) {
    if (isLoading) {
        if(homePlayBtn) homePlayBtn.classList.add('is-loading');
        if(playerPlayBtn) playerPlayBtn.classList.add('is-loading');
        if(stickyPlayBtn) stickyPlayBtn.classList.add('is-loading');
    } else {
        if(homePlayBtn) homePlayBtn.classList.remove('is-loading');
        if(playerPlayBtn) playerPlayBtn.classList.remove('is-loading');
        if(stickyPlayBtn) stickyPlayBtn.classList.remove('is-loading');
    }
}

function updateStatusBadges() {
    const homeLiveBadge = document.querySelector('.live-badge-green');
    const playerLiveBadge = document.getElementById('playerLiveBadge');

    if (isNetworkOffline) {
        if (homeLiveBadge) {
            homeLiveBadge.innerHTML = `<div class="dot-white" style="background-color: #fceb05; animation: none;"></div> SEM INTERNET`;
            homeLiveBadge.style.color = '#fceb05';
        }
        if (playerLiveBadge) {
            playerLiveBadge.style.backgroundColor = 'rgba(252, 235, 5, 0.8)';
            playerLiveBadge.innerHTML = `<div class="dot-white" style="animation: none; opacity: 0.5;"></div> SEM INTERNET`;
        }
    } else if (isOfflineStatus && !isPlayingIntro) {
        if (homeLiveBadge) {
            homeLiveBadge.innerHTML = `<div class="dot-white" style="background-color: #f43f5e; animation: none;"></div> OFFLINE`;
            homeLiveBadge.style.color = '#f43f5e';
        }
        if (playerLiveBadge) {
            playerLiveBadge.style.backgroundColor = 'rgba(244, 63, 94, 0.8)';
            playerLiveBadge.innerHTML = `<div class="dot-white" style="animation: none; opacity: 0.5;"></div> OFFLINE`;
        }
    } else if (isBufferingStatus && !isPlayingIntro) {
        if (homeLiveBadge) {
            homeLiveBadge.innerHTML = `<div class="dot-white" style="background-color: #fceb05;"></div> RECONECTANDO`;
            homeLiveBadge.style.color = '#fceb05';
        }
        if (playerLiveBadge) {
            playerLiveBadge.style.backgroundColor = 'rgba(252, 235, 5, 0.8)';
            playerLiveBadge.innerHTML = `<div class="dot-white"></div> RECONECTANDO`;
        }
    } else {
        if (homeLiveBadge) {
            homeLiveBadge.innerHTML = `<div class="dot-green"></div> AO VIVO`;
            homeLiveBadge.style.color = 'white';
        }
        if (playerLiveBadge) {
            playerLiveBadge.style.backgroundColor = '#ff0000';
            playerLiveBadge.innerHTML = `<div class="dot-white"></div> AO VIVO`;
        }
    }
}

function setBufferingState(isBuffering) {
    isBufferingStatus = isBuffering;
    updateStatusBadges();
}

function setOfflineState(isOffline) {
    isOfflineStatus = isOffline;
    setLoadingState(isOffline);
    updateStatusBadges();
}

// LOGICA DE RECONEXÃO (Falha na Stream)
function handleReconnect() {
    if (!isPlaying || isSwitchingQuality || isNetworkOffline) return; 

    clearTimeout(reconnectTimeout);
    if (!audioPlayer.paused) audioPlayer.pause();

    reconnectAttempts++;
    let delay = Math.min(reconnectAttempts * 2000, 15000); 

    reconnectTimeout = setTimeout(() => {
        if (!isPlaying || isSwitchingQuality || isNetworkOffline) return;
        
        setBufferingState(true);
        setOfflineState(false);
        
        audioPlayer.src = getCurrentStreamUrl(true); 
        audioPlayer.load();
        
        audioPlayer.play().then(() => {
            reconnectAttempts = 0; 
            setBufferingState(false);
            setOfflineState(false);
            
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            if (visualizerActive) routeAudioGraph();
        }).catch(e => {
            setBufferingState(false); 
            setOfflineState(true);
            handleReconnect(); 
        });
    }, delay); 
}

let externalPauseRetryTimeout = null;

if(audioPlayer) {
    // PROTEÇÃO CONTRA ÁUDIO DE TERCEIROS
    audioPlayer.addEventListener('pause', () => {
        if (isPlaying && !activePreviewId && !isSwitchingQuality && !isNetworkOffline && !isPlayingIntro) {
            const tryResumeExternally = () => {
                if (isPlaying && audioPlayer.paused && !isNetworkOffline) {
                    audioPlayer.play().catch(err => {
                        externalPauseRetryTimeout = setTimeout(tryResumeExternally, 1000);
                    });
                }
            };
            clearTimeout(externalPauseRetryTimeout);
            externalPauseRetryTimeout = setTimeout(tryResumeExternally, 500);
        }
    });

    audioPlayer.addEventListener('play', () => {
        clearTimeout(externalPauseRetryTimeout);
    });

    audioPlayer.addEventListener('waiting', () => { 
        if (isPlaying && !isPlayingIntro && !isPlayerStarting) {
            setLoadingState(true); setBufferingState(true); clearTimeout(offlineTimeout);
            offlineTimeout = setTimeout(() => { 
                if (isPlaying && audioPlayer.readyState < 3 && !isNetworkOffline) {
                    isSwitchingQuality = false; 
                    setBufferingState(false); setOfflineState(true); handleReconnect(); 
                }
            }, 15000); 
        }
    });

    audioPlayer.addEventListener('playing', () => { 
        if (isPlaying && !isPlayingIntro) { 
            clearTimeout(offlineTimeout); 
            setOfflineState(false); 
            setBufferingState(false); 
            setLoadingState(false); 
            reconnectAttempts = 0;
            isSwitchingQuality = false;
            
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume().catch(()=>{});
            }
            if (visualizerActive) {
                routeAudioGraph();
            }
        }
    });

    audioPlayer.addEventListener('error', () => { 
        if (isPlaying && !isSwitchingQuality && !isPlayingIntro && !isNetworkOffline) { 
            clearTimeout(offlineTimeout); setBufferingState(true); setOfflineState(false); handleReconnect(); 
        }
    });

    audioPlayer.addEventListener('stalled', () => { 
        if (isPlaying && audioPlayer.readyState === 0 && !isPlayingIntro && !isPlayerStarting && !isNetworkOffline) { 
            setLoadingState(true); setBufferingState(true); clearTimeout(offlineTimeout);
            offlineTimeout = setTimeout(() => { 
                if (isPlaying && !isNetworkOffline) { 
                    isSwitchingQuality = false;
                    setBufferingState(false); setOfflineState(true); handleReconnect(); 
                }
            }, 15000); 
        }
    });
}

// LOGICA DE RECONEXÃO (Falta de Internet)
window.addEventListener('offline', () => { 
    isNetworkOffline = true;
    updateStatusBadges();
    if (isPlaying && !isPlayingIntro) { 
        clearTimeout(reconnectTimeout);
        clearTimeout(offlineTimeout); 
        setBufferingState(false); 
        setOfflineState(false);
        window.showGenericToast('Sem Conexão', 'Aguardando internet retornar...', 'bi-wifi-off', '#f43f5e');
        if (!audioPlayer.paused) audioPlayer.pause();
    } 
});

window.addEventListener('online', () => { 
    isNetworkOffline = false;
    updateStatusBadges();
    if (isPlaying && !isPlayingIntro) { 
        window.showGenericToast('Conectado', 'Internet restaurada. Reconectando...', 'bi-wifi', '#4ade80');
        setBufferingState(true);
        handleReconnect(); 
    } 
});

// ==========================================
// MEDIA SESSION & TRACKING
// ==========================================
let totalListenedTime = 0;
let lastTimeUpdateRef = 0;

if(audioPlayer) {
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.buffered.length === 0 || isPlayingIntro) return;
        
        const current = audioPlayer.currentTime;
        
        if (lastTimeUpdateRef > 0) {
            const delta = current - lastTimeUpdateRef;
            if (delta > 0 && delta < 5) {
                totalListenedTime += delta;
                
                if (isBufferingStatus || isOfflineStatus) {
                    setBufferingState(false);
                    setOfflineState(false);
                    setLoadingState(false);
                    reconnectAttempts = 0;
                }
            }
        }
        lastTimeUpdateRef = current;
    });
}

if(appContainer) {
    appContainer.addEventListener('scroll', () => {
        const stickyBar = document.getElementById('stickyBottomBar');
        if(!stickyBar) return;
        
        if (appContainer.classList.contains('player-mode') && appContainer.scrollTop > 200) { 
            stickyBar.classList.add('show'); 
            if (mainPlayerControls) mainPlayerControls.classList.add('hidden'); 
        } else { 
            stickyBar.classList.remove('show'); 
            if (mainPlayerControls) mainPlayerControls.classList.remove('hidden'); 
        }
    });
}

// ==========================================
// VOLUME E PLAYBACK INICIAL
// ==========================================
const volumeToggleBtn = document.getElementById('volumeToggleBtn');
const stickyVolumeBtn = document.getElementById('stickyVolumeBtn');

if(audioPlayer) audioPlayer.volume = 1; 
if(previewAudio) previewAudio.volume = 1;
if(introAudio) introAudio.volume = 1;

function toggleMute(e) {
    e.stopPropagation(); 
    globalVolume = (globalVolume > 0) ? 0 : 1;
    
    [audioPlayer, previewAudio, introAudio].forEach(p => { 
        if(p) { p.volume = globalVolume; }
    });

    [volumeToggleBtn, stickyVolumeBtn].forEach(btn => { 
        if(!btn) return; 
        btn.classList.remove('bi-volume-up', 'bi-volume-mute'); 
        btn.classList.add(globalVolume > 0 ? 'bi-volume-up' : 'bi-volume-mute'); 
    });
}
if (volumeToggleBtn) volumeToggleBtn.addEventListener('click', toggleMute);
if (stickyVolumeBtn) stickyVolumeBtn.addEventListener('click', toggleMute);

function startMainStream() {
    isPlayingIntro = false;
    setLoadingState(true); clearTimeout(offlineTimeout); setOfflineState(false);
    
    const targetUrl = getCurrentStreamUrl();
    if (!audioPlayer.src || !audioPlayer.src.includes(targetUrl)) {
        audioPlayer.src = targetUrl;
        audioPlayer.load();
    }
    
    if (currentTrackMetadata && currentTrackMetadata.title) updateUIText(currentTrackMetadata);
    
    const station = stations[currentStationIndex];
    const useEq = (station.equalizador === true || String(station.equalizador).toLowerCase() === "true");
    const useVis = (station.visualizer === true || String(station.visualizer).toLowerCase() === "true");
    
    if (useEq || useVis || audioCtx) {
        initVisualizer(); 
    }
    
    audioPlayer.volume = globalVolume;
    audioPlayer.play().then(() => {
        setLoadingState(false); 
        clearTimeout(offlineTimeout); 
        setOfflineState(false);
    }).catch(e => {
        isSwitchingQuality = false; 
        if (e.name !== 'AbortError' && isPlaying && !isNetworkOffline) { 
            setBufferingState(false); setOfflineState(true); handleReconnect(); 
        }
    });
}

function playIntro(introUrl) {
    isPlayingIntro = true;
    introPlayedForCurrentStation = true; 
    setLoadingState(true);
    
    introAudio.volume = globalVolume;
    introAudio.src = introUrl;
    introAudio.load();
    
    let introFallbackTimeout = setTimeout(() => {
        if (isPlayingIntro) {
            isPlayingIntro = false;
            introAudio.pause();
            startMainStream();
        }
    }, 6000); 

    introAudio.play().then(() => {
        setLoadingState(false);
        if (currentTrackMetadata && currentTrackMetadata.title) updateUIText(currentTrackMetadata);
    }).catch(e => {
        clearTimeout(introFallbackTimeout);
        isPlayingIntro = false;
        startMainStream();
    });

    introAudio.onended = () => { clearTimeout(introFallbackTimeout); if(isPlayingIntro) { isPlayingIntro = false; startMainStream(); } };
    introAudio.onerror = () => { clearTimeout(introFallbackTimeout); if(isPlayingIntro) { isPlayingIntro = false; startMainStream(); } };
}

function toggleLivePlay() {
    if (activePreviewId) { stopPreview(false); } 
    wasPlayingBeforePreview = false; 

    const station = stations[currentStationIndex];
    if (!station.streams[activeQualityLevel] || !station.streams[activeQualityLevel].url) { activeQualityLevel = Object.keys(station.streams).find(k => station.streams[k] && station.streams[k].url); updateQualityBadges(); }

    if (!isPlaying) {
        isPlaying = true;
        isPlayerStarting = true;
        setTimeout(() => { isPlayerStarting = false; }, 10000); 
        
        const homeView = document.getElementById('homeView'); const playerView = document.getElementById('playerView');
        if(homeView) homeView.style.display = 'none'; if(playerView) playerView.style.display = 'flex'; if(appContainer) appContainer.classList.add('player-mode');
        setTimeout(() => { if (currentTrackMetadata && currentTrackMetadata.title) updateUIText(currentTrackMetadata); }, 50);

        if(playerPlayIcon) playerPlayIcon.classList.replace('bi-play-fill', 'bi-pause-fill'); 
        if(stickyPlayIcon) stickyPlayIcon.classList.replace('bi-play-fill', 'bi-pause-fill');
        
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";
        updateMediaSession();
        
        if (station.intro && station.intro.trim() !== "" && !introPlayedForCurrentStation) {
            playIntro(station.intro);
        } else {
            startMainStream();
        }
    } else {
        isPlaying = false;
        isPlayerStarting = false;
        isSwitchingQuality = false;
        
        clearTimeout(reconnectTimeout);
        clearTimeout(offlineTimeout);
        clearTimeout(externalPauseRetryTimeout);
        setLoadingState(false);
        setBufferingState(false);
        
        if(playerPlayIcon) playerPlayIcon.classList.replace('bi-pause-fill', 'bi-play-fill'); 
        if(stickyPlayIcon) stickyPlayIcon.classList.replace('bi-pause-fill', 'bi-play-fill');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
        
        if (isPlayingIntro) {
            introAudio.pause();
            introAudio.src = '';
            introAudio.load();
            isPlayingIntro = false;
        }
        stopAndClearAudio(); 
    }
}

// ==========================================
// MUDANÇA DE ESTAÇÃO
// ==========================================
let stationChangeTimeout = null;

window.changeStation = function(index) {
    if(stationChangeTimeout) clearTimeout(stationChangeTimeout);
    stationChangeTimeout = setTimeout(() => {
        executeChangeStation(index);
    }, 150);
}

function executeChangeStation(index) {
    if (activePreviewId) stopPreview(false);
    currentStationIndex = index; localStorage.setItem('lastStationIndex', index);
    isSwitchingQuality = false; firstHistoryRender = true; currentTrackId = ""; previousListenersCount = -1; 
    
    totalListenedTime = 0;
    lastTimeUpdateRef = 0;
    introPlayedForCurrentStation = false; 
    
    const station = stations[index];

    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        if (station.record === false || String(station.record).toLowerCase() === "false") {
            recordBtn.style.opacity = '0.4';
        } else {
            recordBtn.style.opacity = '1';
        }
    }

    const homeBtn = document.getElementById('homePlayBtn');
    if (homeBtn && !isPlaying) {
        homeBtn.classList.remove('shake-anim');
        void homeBtn.offsetWidth; 
        homeBtn.classList.add('shake-anim');
    }

    const contactBtn = document.getElementById('contactBtn');
    if (contactBtn) { if (station.contact) { contactBtn.href = station.contact; contactBtn.style.display = 'flex'; } else { contactBtn.style.display = 'none'; } }
    
    const stModal = document.getElementById('stationsModal');
    if(stModal) { stModal.classList.remove('show'); clearTimeout(stationsAutoCloseTimeout); }

    const headerLogo = document.getElementById('headerLogo'); if (headerLogo) headerLogo.src = station.logotipo || "https://wapka-img.zuna.id/beff413d.png";
    
    let fallbackArt = station.defaultArt; let fallbackBgArt = station.bgdefaultArt || fallbackArt;
    const homeArt = document.getElementById('homeCoverArt'); const playerArt = document.getElementById('playerCoverArt'); const appBg = document.getElementById('appBackground');
    
    if(homeArt) homeArt.style.backgroundImage = `url('${fallbackArt}')`; 
    if(playerArt) playerArt.style.backgroundImage = `url('${fallbackArt}')`; 
    if(appBg) appBg.style.backgroundImage = `url('${fallbackBgArt}')`;
    
    updateThemeColor(fallbackArt); 

    if (currentQualityMode === 'auto') { evaluateNetworkAndSetQuality(); } 
    else {
        if(!station.streams[currentQualityMode] || !station.streams[currentQualityMode].url) activeQualityLevel = Object.keys(station.streams).find(k => station.streams[k] && station.streams[k].url);
        else activeQualityLevel = currentQualityMode;
        updateQualityBadges();
    }

    fetchMetadata(true); 
    
    if (isPlaying) {
        setLoadingState(true); clearTimeout(offlineTimeout); setOfflineState(false);
        isPlayerStarting = true;
        setTimeout(() => { isPlayerStarting = false; }, 10000);

        const proceedWithNewStation = () => {
            if (station.intro && station.intro.trim() !== "" && !introPlayedForCurrentStation) {
                audioPlayer.src = '';
                audioPlayer.load();
                playIntro(station.intro);
            } else {
                audioPlayer.src = '';
                audioPlayer.load();
                startMainStream();
            }
        };

        if (isPlayingIntro) {
            introAudio.pause();
            introAudio.src = '';
            introAudio.load();
            isPlayingIntro = false;
        }
        
        if (!audioPlayer.paused) audioPlayer.pause();
        proceedWithNewStation();
        
    } else { 
        if(audioPlayer) {
            audioPlayer.src = getCurrentStreamUrl(); 
            audioPlayer.load();
        }
    }
}

function openStationsModalHandler() {
    renderStationsModal(); 
    const stModal = document.getElementById('stationsModal');
    if(stModal) stModal.classList.add('show'); 
    resetStationsAutoClose();
}

const homeOpenStationsBtn = document.getElementById('homeOpenStationsBtn');
if (homeOpenStationsBtn) homeOpenStationsBtn.addEventListener('click', openStationsModalHandler);

const openStationsBtn = document.getElementById('openStationsBtn');
if (openStationsBtn) openStationsBtn.addEventListener('click', openStationsModalHandler);

const closeStationsBtn = document.getElementById('closeStationsBtn');
if(closeStationsBtn) closeStationsBtn.addEventListener('click', () => { 
    const stModal = document.getElementById('stationsModal');
    if(stModal) stModal.classList.remove('show'); 
    clearTimeout(stationsAutoCloseTimeout);
});

function prevStation() { window.changeStation(currentStationIndex === 0 ? stations.length - 1 : currentStationIndex - 1); }
function nextStation() { window.changeStation(currentStationIndex === stations.length - 1 ? 0 : currentStationIndex + 1); }

if(homePlayBtn) {
    homePlayBtn.addEventListener('click', () => {
        if(!prerollPlayed) playPrerollAd();
        else toggleLivePlay();
    });
}
if(playerPlayBtn) playerPlayBtn.addEventListener('click', toggleLivePlay);
if(stickyPlayBtn) stickyPlayBtn.addEventListener('click', toggleLivePlay);

const btnPrevStation = document.getElementById('prevStationBtn'); const btnNextStation = document.getElementById('nextStationBtn');
const btnStickyPrev = document.getElementById('stickyPrevBtn'); const btnStickyNext = document.getElementById('stickyNextBtn');

if(btnPrevStation) btnPrevStation.addEventListener('click', prevStation); if(btnNextStation) btnNextStation.addEventListener('click', nextStation);
if(btnStickyPrev) btnStickyPrev.addEventListener('click', prevStation); if(btnStickyNext) btnStickyNext.addEventListener('click', nextStation);

function setupMediaSession() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', toggleLivePlay); 
        navigator.mediaSession.setActionHandler('pause', toggleLivePlay);
        navigator.mediaSession.setActionHandler('previoustrack', prevStation); 
        navigator.mediaSession.setActionHandler('nexttrack', nextStation);
    }
}

// LOGICA OTIMIZADA DO MEDIA SESSION
function updateMediaSession() {
    if ('mediaSession' in navigator && currentTrackMetadata.title) {
        const station = stations[currentStationIndex];
        navigator.mediaSession.metadata = new MediaMetadata({ 
            // Formato exigido: Artista - Título no principal, Nome da Estação em baixo.
            title: `${currentTrackMetadata.artist} - ${currentTrackMetadata.title}`, 
            artist: station.name, 
            album: station.description || 'Transmissão Local', 
            artwork: [{ src: currentTrackMetadata.art, sizes: '512x512', type: 'image/png' }] 
        });
    }
}

// ==========================================
// UI TEXT, METADATA E BACKGROUND DYNAMICS
// ==========================================
function autoAdjustFont(text, defaultSize, maxLength, step, minSize) {
    if (!text) return defaultSize + 'px';
    if (text.length > maxLength) { const overflowLength = text.length - maxLength; return Math.max(minSize, defaultSize - (overflowLength * step)) + 'px'; }
    return defaultSize + 'px';
}

function applyMarquee(element) {
    element.classList.remove('scrolling-text'); element.style.transform = 'translateX(0)';
    if (element.offsetWidth === 0) return;
    setTimeout(() => {
        const parent = element.parentElement; const overflow = element.scrollWidth - parent.clientWidth;
        if (overflow > 5) { element.style.setProperty('--overflow-amount', `-${overflow}px`); element.classList.add('scrolling-text'); }
    }, 50);
}

function isDefaultTrack(title, artist, stationName) {
    return (
        title === 'Conectando...' || 
        artist === 'Aguarde' || 
        title === stationName || 
        artist === 'Transmissão Local' || 
        title === 'Transmissão offline...'
    );
}

function updateUIText(metadata) {
    currentTrackMetadata = metadata; 
    const station = stations[currentStationIndex];

    const els = [ { t: document.getElementById('homeSongTitle'), a: document.getElementById('homeSongArtist') }, { t: document.getElementById('playerSongTitle'), a: document.getElementById('playerSongArtist') } ];
    const isDesktop = window.innerWidth >= 768;

    els.forEach(el => {
        if(el.t) {
            if (isDesktop) { el.t.style.fontSize = '28px'; el.t.textContent = metadata.title; applyMarquee(el.t); } 
            else { el.t.classList.remove('scrolling-text'); el.t.style.transform = 'none'; el.t.style.fontSize = autoAdjustFont(metadata.title, 28, 25, 0.4, 16); el.t.textContent = metadata.title; }
        }
        if(el.a) {
            if (isDesktop) { el.a.style.fontSize = '18px'; el.a.innerHTML = `<span>${metadata.artist}</span>`; applyMarquee(el.a); } 
            else { el.a.classList.remove('scrolling-text'); el.a.style.transform = 'none'; el.a.style.fontSize = autoAdjustFont(metadata.artist, 18, 30, 0.3, 12); el.a.innerHTML = `<span>${metadata.artist}</span>`; }
        }
    });

    if (shareOverlay) {
        const isInvalid = !isValidTrack(metadata.title, metadata.artist) || !isTrackAllowed(metadata.title, metadata.artist);
        const isDefault = isDefaultTrack(metadata.title, metadata.artist, station.name);
        
        if (isInvalid || isDefault) shareOverlay.style.display = 'none';
        else shareOverlay.style.display = 'flex';
    }
    
    updateLikeDislikeUI();
}

function renderEmptyHistory() {
    if (historyGrid) historyGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 30px 10px; color: rgba(255,255,255,0.6); font-size: 14px; background: rgba(255,255,255,0.05); border-radius: 12px;"><i class="bi bi-exclamation-triangle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>Histórico não encontrado.</div>`;
}

function applyOfflineMetadata(station, forceRefresh) {
    if (station.id !== stations[currentStationIndex].id) return;
    let fallbackMetadata = { title: station.name, artist: station.description || "Transmissão Local", art: station.defaultArt, bgArt: station.bgdefaultArt || station.defaultArt };
    
    const pseudoId = `offline-${station.id}`;
    if (currentTrackId !== pseudoId || forceRefresh) {
        currentTrackId = pseudoId; updateUIText(fallbackMetadata); updateUIArt(fallbackMetadata.art, fallbackMetadata.bgArt); currentTrackMetadata = fallbackMetadata; updateMediaSession();
        checkAndFetchLyrics(fallbackMetadata.title, fallbackMetadata.artist);
    }
}

function handleFallbackMetadata(station, forceRefresh, historyObj) {
    applyOfflineMetadata(station, forceRefresh);
    if (!activePreviewId) {
        const localHist = cleanAndGetLocalHistory(station.id);
        if (historyObj && historyObj.length > 0) renderHistory(historyObj, station.defaultArt); 
        else renderHistory(localHist, station.defaultArt);
    }
}

async function fetchMetadata(forceRefresh = false) {
    const station = stations[currentStationIndex];
    const activeStationIdAtFetch = station.id; 
    
    if (!station.api || station.api.trim() === "") { handleFallbackMetadata(station, forceRefresh, []); return; }

    const { songObj, historyObj, listeners } = await fetchStationData(station);

    if (activeStationIdAtFetch !== stations[currentStationIndex].id) return; 

    if (typeof listeners === 'number' && !isNaN(listeners)) {
        if (previousListenersCount !== -1) {
            if (listeners > previousListenersCount) window.showListenerToast('connect', listeners);
            else if (listeners < previousListenersCount) window.showListenerToast('disconnect', listeners);
        }
        previousListenersCount = listeners;
    }

    if (songObj) {
        const trackIdentifier = `${songObj.title} - ${songObj.artist}`;
        
        // Coletar tempo da música
        window.currentSongDuration = songObj.duration || 0;
        window.currentSongElapsed = songObj.elapsed || 0;
        if (!window.currentSongElapsed && songObj.played_at) {
            window.currentSongElapsed = Math.floor(Date.now() / 1000) - songObj.played_at;
        }
        if (window.currentSongElapsed < 0) window.currentSongElapsed = 0;
        
        // Atualiza a Referência do tempo localmente para a animação progressiva sub-segundo!
        window.lastSongUpdateTimeRefMs = Date.now();

        if (currentTrackId !== trackIdentifier || forceRefresh) {
            currentTrackId = trackIdentifier;

            if (isValidTrack(songObj.title, songObj.artist) && isTrackAllowed(songObj.title, songObj.artist)) {
                
                let metadata = { title: songObj.title, artist: songObj.artist, art: station.defaultArt, bgArt: station.bgdefaultArt || station.defaultArt };
                updateUIText(metadata);
                checkAndFetchLyrics(metadata.title, metadata.artist);

                const localHistory = addTrackToLocalHistory(station.id, songObj);
                
                fetchItunesData(metadata.title, metadata.artist).then(itunes => {
                    if (activeStationIdAtFetch !== stations[currentStationIndex].id) return;
                    if (itunes && itunes.art) { metadata.art = itunes.art; metadata.bgArt = itunes.art; } 
                    else if (songObj.art && songObj.art.trim() !== "") { metadata.art = songObj.art; metadata.bgArt = songObj.art; }
                    updateUIArt(metadata.art, metadata.bgArt); currentTrackMetadata = metadata; updateMediaSession();
                }).catch(() => {
                    if (songObj.art && songObj.art.trim() !== "") { metadata.art = songObj.art; metadata.bgArt = songObj.art; }
                    updateUIArt(metadata.art, metadata.bgArt); currentTrackMetadata = metadata; updateMediaSession();
                });

                if (!activePreviewId) {
                    if (historyObj && historyObj.length > 0) renderHistory(historyObj, station.defaultArt); 
                    else renderHistory(localHistory, station.defaultArt);
                }
            } else {
                if (isDefaultTrack(currentTrackMetadata.title, currentTrackMetadata.artist, station.name)) {
                    handleFallbackMetadata(station, forceRefresh, historyObj);
                }
            }
        }
    } else {
        if (isDefaultTrack(currentTrackMetadata.title, currentTrackMetadata.artist, station.name)) {
            handleFallbackMetadata(station, forceRefresh, historyObj);
        }
    }
}

function updateUIArt(newArtUrl, bgArtUrl) {
    const homeCoverArt = document.getElementById('homeCoverArt'); const playerCoverArt = document.getElementById('playerCoverArt'); const appBackground = document.getElementById('appBackground');
    if (homeCoverArt && homeCoverArt.style.backgroundImage.includes(newArtUrl)) return;
    
    if(homeCoverArt) homeCoverArt.style.opacity = '0'; if(playerCoverArt) playerCoverArt.classList.add('animating'); if(appBackground) appBackground.style.opacity = '0.1'; 
    
    setTimeout(() => {
        if(homeCoverArt) { homeCoverArt.style.backgroundImage = `url('${newArtUrl}')`; homeCoverArt.style.opacity = '1'; }
        if(playerCoverArt) { playerCoverArt.style.backgroundImage = `url('${newArtUrl}')`; playerCoverArt.classList.remove('animating'); }
        if(appBackground) { appBackground.style.backgroundImage = `url('${bgArtUrl || newArtUrl}')`; appBackground.style.opacity = '1'; }
        
        updateThemeColor(newArtUrl);
    }, 500); 
}

async function renderStationsModal() {
    const grid = document.getElementById('stationsGrid'); if(!grid) return;
    
    grid.innerHTML = stations.map((st, index) => {
        let trackInfo = st.description || "Transmissão Local"; let trackArt = st.defaultArt;
        if (st.id === stations[currentStationIndex].id && currentTrackMetadata.title && currentTrackMetadata.artist !== 'Aguarde') {
            if (currentTrackMetadata.title !== st.name) trackInfo = `${currentTrackMetadata.artist} - ${currentTrackMetadata.title}`;
            trackArt = currentTrackMetadata.art || st.defaultArt;
        }
        return `
        <div class="station-card ${index === currentStationIndex ? 'active' : ''}" onclick="window.changeStation(${index})">
            <div class="station-cover-container">
                <div class="station-default-art" style="background-image: url('${st.defaultArt}')"></div>
                <div class="station-track-art" id="station-art-${index}" style="background-image: url('${trackArt}')"></div>
                <div class="station-play-overlay"><div class="station-play-btn"><i class="bi bi-play-fill"></i></div></div>
                <div class="station-active-overlay"><div class="eq-container"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></div><span style="color:#4ade80; font-size:10px; font-weight:700; letter-spacing:1px;">TOCANDO</span></div>
            </div>
            <div class="station-info"><div class="station-name">${st.name}</div><div class="station-track" id="station-track-${index}" title="${trackInfo}">${trackInfo}</div></div>
        </div>`;
    }).join('');

    stations.forEach(async (st, index) => {
        if (st.id === stations[currentStationIndex].id) return; 
        try {
            if (st.api && st.api.trim() !== "") {
                const { songObj } = await fetchStationData(st);
                if (songObj && isValidTrack(songObj.title, songObj.artist) && isTrackAllowed(songObj.title, songObj.artist)) {
                    let updatedInfo = `${songObj.artist} - ${songObj.title}`; let updatedArt = songObj.art || st.defaultArt;
                    const itunes = await fetchItunesData(songObj.title, songObj.artist); if (itunes && itunes.art) updatedArt = itunes.art;
                    const trackEl = document.getElementById(`station-track-${index}`); const artEl = document.getElementById(`station-art-${index}`);
                    if (trackEl) { trackEl.textContent = updatedInfo; trackEl.title = updatedInfo; }
                    if (artEl) artEl.style.backgroundImage = `url('${updatedArt}')`;
                }
            }
        } catch(e) {}
    });
}

async function renderHistory(historyArray, fallbackArt) {
    if(!historyGrid) return;
    if (!historyArray || historyArray.length === 0) { renderEmptyHistory(); firstHistoryRender = false; return; }

    const validHistory = []; 
    const seenTitles = new Set(); 
    const st = stations[currentStationIndex]; 
    const activeStationIdAtRender = st.id;
    const historyLimit = Math.max(10, Math.min(30, st.limitHistory || 10));

    const currentTitleNormalized = currentTrackMetadata && currentTrackMetadata.title ? currentTrackMetadata.title.toLowerCase().trim() : "";

    for (const item of historyArray) {
        const song = item.song || item; 
        if (!song.title || !song.artist || !isValidTrack(song.title, song.artist) || !isTrackAllowed(song.title, song.artist)) continue;
        
        const titleNormalized = song.title.toLowerCase().trim();
        
        if (titleNormalized === currentTitleNormalized) {
            continue;
        }
        
        if (!seenTitles.has(titleNormalized)) { 
            validHistory.push(item); 
            seenTitles.add(titleNormalized); 
        }
        if (validHistory.length >= historyLimit) break;
    }
    
    if (validHistory.length === 0) { renderEmptyHistory(); firstHistoryRender = false; return; }

    const historyData = await Promise.all(validHistory.map(async (item, index) => {
        const song = item.song || item; let art = fallbackArt; let preview = null; let link = '#';
        const itunes = await fetchItunesData(song.title, song.artist);
        if (itunes && itunes.art) { art = itunes.art; preview = itunes.preview; link = itunes.link || '#'; } else if (song.art || song.cover) { art = song.art || song.cover; }
        let playedAt; if(item.played_at) playedAt = new Date(item.played_at * 1000); else if(item.timestamp) playedAt = new Date(item.timestamp * 1000); else playedAt = new Date(); 
        const timeString = playedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return { ...song, art, preview, link, timeString, safeId: `track_${index}` };
    }));

    if (activeStationIdAtRender !== stations[currentStationIndex].id) return;
    const animClass = firstHistoryRender ? 'animate-card' : ''; const opacityStyle = firstHistoryRender ? '' : 'opacity: 1;';

    historyGrid.innerHTML = historyData.map((data, index) => `
        <div class="history-card ${animClass}" id="card_${data.safeId}" style="${firstHistoryRender ? `animation-delay: ${index * 0.08}s;` : opacityStyle}" onclick="window.toggleHistoryActions('${data.safeId}')">
            <div class="history-cover">
                <div class="skeleton-loader"></div>
                <div class="history-cover-img" id="img_${data.safeId}"></div>
                <div class="time-ago-badge"><i class="bi bi-clock"></i> ${data.timeString}</div>
                <div class="history-overlay">
                    <button class="preview-btn ${!data.preview ? 'no-preview' : ''}" ${!data.preview ? 'disabled title="Preview indisponível"' : `onclick="event.stopPropagation(); window.togglePreview('${data.preview}', '${data.safeId}')"`}>
                        <svg width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="18"></circle><circle cx="21" cy="21" r="18" class="progress-circle" id="circle_${data.safeId}"></circle></svg>
                        <i class="bi bi-play-fill icon" id="icon_${data.safeId}"></i>
                    </button>
                    <a href="${data.link}" target="_blank" class="itunes-btn ${data.link === '#' ? 'no-preview' : ''}" ${data.link === '#' ? 'onclick="event.stopPropagation(); return false;"' : 'onclick="event.stopPropagation();" title="Abrir no iTunes"'}><i class="bi bi-apple"></i></a>
                </div>
            </div>
            <div class="history-info"><div class="history-title" title="${data.title}">${data.title}</div><div class="history-artist" title="${data.artist}">${data.artist}</div></div>
        </div>
    `).join('');
    
    historyData.forEach(data => {
        const imgEl = document.getElementById(`img_${data.safeId}`);
        if(imgEl) {
            const img = new Image();
            img.onload = () => {
                imgEl.style.backgroundImage = `url('${data.art}')`;
                imgEl.classList.add('loaded');
            };
            img.onerror = () => {
                imgEl.style.backgroundImage = `url('${fallbackArt}')`;
                imgEl.classList.add('loaded');
            };
            img.src = data.art;
        }
    });

    firstHistoryRender = false;
}

let activePreviewId = null;

window.togglePreview = function(url, safeId) {
    if (activePreviewId === safeId && previewAudio && !previewAudio.paused) { stopPreview(true); return; }
    
    if (isPlaying) { 
        wasPlayingBeforePreview = true; 
        audioPlayer.pause();
        if(playerPlayIcon) playerPlayIcon.classList.replace('bi-pause-fill', 'bi-play-fill'); 
        if(stickyPlayIcon) stickyPlayIcon.classList.replace('bi-pause-fill', 'bi-play-fill'); 
    } else { 
        wasPlayingBeforePreview = false; 
    }

    if (activePreviewId) {
        const prevCard = document.getElementById(`card_${activePreviewId}`); const prevIcon = document.getElementById(`icon_${activePreviewId}`); const prevCircle = document.getElementById(`circle_${activePreviewId}`);
        if (prevCard) prevCard.classList.remove('active'); if (prevIcon) prevIcon.classList.replace('bi-pause-fill', 'bi-play-fill'); if (prevCircle) prevCircle.style.strokeDashoffset = 113; 
        if(previewAudio) { previewAudio.pause(); previewAudio.src = ''; previewAudio.load(); }
    }

    activePreviewId = safeId;
    const newCard = document.getElementById(`card_${safeId}`); const newIcon = document.getElementById(`icon_${safeId}`);
    if(newCard) newCard.classList.add('active'); if(newIcon) newIcon.classList.replace('bi-play-fill', 'bi-pause-fill');
    if(previewAudio) { 
        previewAudio.volume = globalVolume;
        previewAudio.src = url; 
        previewAudio.play().catch(()=>{}); 
    }
}

function stopPreview(resumeLive = true) {
    if (activePreviewId) {
        const prevCard = document.getElementById(`card_${activePreviewId}`); const prevIcon = document.getElementById(`icon_${activePreviewId}`); const prevCircle = document.getElementById(`circle_${activePreviewId}`);
        if (prevCard) prevCard.classList.remove('active'); if (prevIcon) prevIcon.classList.replace('bi-pause-fill', 'bi-play-fill'); if (prevCircle) prevCircle.style.strokeDashoffset = 113; 
    }
    activePreviewId = null;
    
    if (previewAudio) { 
        previewAudio.pause();
        previewAudio.src = ''; 
        previewAudio.load(); 
    }
        
    if (resumeLive && wasPlayingBeforePreview) {
        wasPlayingBeforePreview = false;
        audioPlayer.play().then(() => {
            if(playerPlayIcon) playerPlayIcon.classList.replace('bi-play-fill', 'bi-pause-fill'); 
            if(stickyPlayIcon) stickyPlayIcon.classList.replace('bi-play-fill', 'bi-pause-fill');
        }).catch(()=>{});
    }
}

if(previewAudio) {
    previewAudio.addEventListener('timeupdate', () => {
        if (activePreviewId && previewAudio.duration) {
            const progress = previewAudio.currentTime / previewAudio.duration; const activeCircle = document.getElementById(`circle_${activePreviewId}`);
            if (activeCircle) activeCircle.style.strokeDashoffset = 113 - (113 * progress);
        }
    });
    previewAudio.addEventListener('ended', () => stopPreview(true));
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
const targetStation = stations[currentStationIndex];
const initialHomeArt = document.getElementById('homeCoverArt'); const initialPlayerArt = document.getElementById('playerCoverArt'); const initialBackground = document.getElementById('appBackground'); const initialLogo = document.getElementById('headerLogo');

if(initialHomeArt) initialHomeArt.style.backgroundImage = `url('${targetStation.defaultArt}')`; 
if(initialPlayerArt) initialPlayerArt.style.backgroundImage = `url('${targetStation.defaultArt}')`; 
if(initialBackground) initialBackground.style.backgroundImage = `url('${targetStation.bgdefaultArt || targetStation.defaultArt}')`; 
if(initialLogo && targetStation.logotipo) initialLogo.src = targetStation.logotipo;

updateThemeColor(targetStation.defaultArt);

const initialContactBtn = document.getElementById('contactBtn');
if (initialContactBtn) { if (targetStation.contact) { initialContactBtn.href = targetStation.contact; initialContactBtn.style.display = 'flex'; } else { initialContactBtn.style.display = 'none'; } }

const initialRecordBtn = document.getElementById('recordBtn');
if (initialRecordBtn) {
    if (targetStation.record === false || String(targetStation.record).toLowerCase() === "false") {
        initialRecordBtn.style.opacity = '0.4';
    } else {
        initialRecordBtn.style.opacity = '1';
    }
}

if (stations.length <= 1) {
    const homeOpenStationsBtn = document.getElementById('homeOpenStationsBtn');
    if (homeOpenStationsBtn) { homeOpenStationsBtn.style.display = 'none'; }

    const homeButtonsWrapper = document.querySelector('.home-buttons-wrapper');
    if (homeButtonsWrapper) { homeButtonsWrapper.style.justifyContent = 'center'; }

    const btnEstacoes = document.getElementById('openStationsBtn'); 
    if (btnEstacoes) { btnEstacoes.style.opacity = '0.4'; btnEstacoes.style.pointerEvents = 'none'; btnEstacoes.style.cursor = 'not-allowed'; }
    
    const navArrows = ['prevStationBtn', 'nextStationBtn', 'stickyPrevBtn', 'stickyNextBtn']; 
    navArrows.forEach(id => { const arrowEl = document.getElementById(id); if (arrowEl) { arrowEl.style.opacity = '0.4'; arrowEl.style.pointerEvents = 'none'; } });
}

setupMediaSession();
if ('connection' in navigator) navigator.connection.addEventListener('change', evaluateNetworkAndSetQuality);
if (currentQualityMode === 'auto') evaluateNetworkAndSetQuality(); else applyQualityStream(currentQualityMode);
updateQualityBadges(); 

checkFavoritesMenu();
fetchMetadata(); 
setInterval(fetchMetadata, updateIntervalTime); 
