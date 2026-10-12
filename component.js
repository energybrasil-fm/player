// ==========================================
// COMPONENT.JS - Módulos de Funcionalidades
// ==========================================

// --- 1. COLOR THIEF & THEME ---
export function getNeonColor(r, g, b) {
    let max = Math.max(r, g, b);
    if (max === 0) return [0, 255, 255]; 
    let factor = 255 / max;
    return [
        Math.min(255, Math.floor(r * factor)),
        Math.min(255, Math.floor(g * factor)),
        Math.min(255, Math.floor(b * factor))
    ];
}

export function updateThemeColor(imageUrl, corsProxy) {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'Anonymous'; 
    img.onload = function() {
        try {
            const colorThief = new ColorThief();
            const color = colorThief.getColor(img);
            let palette = colorThief.getPalette(img, 3);
            
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
        finalUrl = corsProxy + encodeURIComponent(finalUrl);
    }
    img.src = finalUrl;
}


// --- 2. GOOGLE IMA (VAST) ADS SYSTEM ---
let adDisplayContainer, adsLoader, adsManager;
export let prerollPlayed = false;
let onAdCompleteCallback = null;

const VAST_TAG_URL = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_preroll_skippable&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';

export function initIMA() {
    if (typeof google === 'undefined' || !google.ima) return; 
    const adVideoElement = document.getElementById('adVideoElement');
    const adContainer = document.getElementById('adContainer');
    adDisplayContainer = new google.ima.AdDisplayContainer(adContainer, adVideoElement);
    adsLoader = new google.ima.AdsLoader(adDisplayContainer);
    adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, onAdsManagerLoaded, false);
    adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);
    
    window.addEventListener('resize', () => {
        if (adsManager) adsManager.resize(window.innerWidth, window.innerHeight, google.ima.ViewMode.NORMAL);
    });
}

export function playPrerollAd(callback) {
    onAdCompleteCallback = callback;
    if (typeof google === 'undefined' || !google.ima || !adsLoader) {
        prerollPlayed = true;
        if(onAdCompleteCallback) onAdCompleteCallback();
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
    adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, resumeToStream);
    adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED, resumeToStream);
    adsManager.addEventListener(google.ima.AdEvent.Type.USER_CLOSE, resumeToStream);
    
    try {
        adsManager.init(window.innerWidth, window.innerHeight, google.ima.ViewMode.NORMAL);
        adsManager.start();
    } catch (adError) { onAdError(); }
}

function onAdError() { resumeToStream(); }
function resumeToStream() {
    if (adsManager) { adsManager.destroy(); }
    const adOverlay = document.getElementById('adOverlay');
    if(adOverlay) adOverlay.style.display = 'none';
    if (onAdCompleteCallback) onAdCompleteCallback();
}


// --- 3. GRAVADOR DE ÁUDIO ---
let recordController = null;
let recordedChunks = [];
let isRecording = false;
let recordMimeType = '';
let recordExtension = 'mp3';

export async function toggleRecording(station, streamUrl, showToast) {
    const recordBtn = document.getElementById('recordBtn');
    const headerDropdown = document.getElementById('headerDropdown');

    if (station.record === false || String(station.record).toLowerCase() === "false") {
        showToast('Gravação Bloqueada', 'Esta estação não permite a gravação da transmissão.', 'bi bi-ban', '#f43f5e');
        if(headerDropdown) headerDropdown.classList.remove('show');
        return;
    }

    if (!isRecording) {
        try {
            if (!streamUrl) {
                showToast('Aviso', 'Nenhuma transmissão ativa para gravar.', 'bi-exclamation-triangle-fill', '#fceb05');
                headerDropdown.classList.remove('show');
                return;
            }

            recordController = new AbortController();
            recordedChunks = [];
            if(headerDropdown) headerDropdown.classList.remove('show');
            showToast('Conectando', 'Iniciando captura da transmissão...', 'bi-hourglass-split', '#3b82f6');

            const response = await fetch(streamUrl, { signal: recordController.signal });
            if (!response.ok) throw new Error('Network error');

            recordMimeType = response.headers.get('content-type') || '';
            const mimeLower = recordMimeType.toLowerCase();
            
            if (mimeLower.includes('mpeg')) recordExtension = 'mp3';
            else if (mimeLower.includes('aac')) recordExtension = 'aac';
            else if (mimeLower.includes('ogg')) recordExtension = 'ogg';
            else if (mimeLower.includes('mp4')) recordExtension = 'm4a';
            else recordExtension = 'mp3';

            isRecording = true;
            recordBtn.innerHTML = '<i class="bi bi-stop-circle" style="color: #f43f5e;"></i> Parar Gravação';
            showToast('Gravando', `Capturando formato original (.${recordExtension})`, 'bi-record-circle', '#ef4444');

            const reader = response.body.getReader();
            const readStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (value) recordedChunks.push(value);
                    }
                } catch (err) {
                    if (err.name === 'AbortError') saveRecording(showToast);
                    else {
                        stopAndDiscardRecording();
                        showToast('Erro', 'A conexão da gravação foi interrompida.', 'bi-x-circle-fill', '#f43f5e');
                    }
                }
            };
            readStream();
        } catch(e) {
            if (e.name !== 'AbortError') showToast('Erro de Segurança', 'O servidor bloqueou a gravação direta (CORS).', 'bi-shield-lock-fill', '#f43f5e');
            stopAndDiscardRecording();
        }
    } else {
        if (recordController) recordController.abort();
    }
}

function saveRecording(showToast) {
    if (recordedChunks.length === 0) { stopAndDiscardRecording(); return; }
    const blob = new Blob(recordedChunks, { type: recordMimeType || 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Gravacao_Radio_${new Date().getTime()}.${recordExtension}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Concluído', `Gravação salva no formato .${recordExtension}`, 'bi-check-circle-fill', '#4ade80');
    stopAndDiscardRecording();
}

function stopAndDiscardRecording() {
    isRecording = false;
    recordedChunks = [];
    recordController = null;
    const recordBtn = document.getElementById('recordBtn');
    if(recordBtn) recordBtn.innerHTML = '<i class="bi bi-record-circle"></i> Gravar Áudio';
}


// --- 4. EQUALIZADOR DSP 3D & WAVES CIRCULARES NEON ---
let audioCtx, analyser, source;
export let visualizerActive = false;
let splitter, merger, delayR, eqBands = [], agcNode, makeupGain, limiterNode;
let audioDataArray;

export function stopAndClearAudio(audioPlayer) {
    try {
        if (!audioPlayer.paused) audioPlayer.pause();
        if (audioCtx && audioCtx.state === 'running') audioCtx.suspend().catch(()=>{});
    } catch(e) {}
}

export function initVisualizer(audioPlayer, canvas, ctx, getState) {
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

            // 10 Band EQ + Compressor
            agcNode = audioCtx.createDynamicsCompressor();
            agcNode.threshold.value = -26; 
            agcNode.knee.value = 15;
            agcNode.ratio.value = 3.5; 
            agcNode.attack.value = 0.3; 
            agcNode.release.value = 1.5; 

            makeupGain = audioCtx.createGain();
            makeupGain.gain.value = 4.0; 

            const eqFreqs = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
            const eqGains = [5.5, 4.5, 1.5, 0.5, -1.0, 0.0, 1.0, 2.5, 4.5, 5.5];

            eqBands = [];
            for (let i = 0; i < 10; i++) {
                let band = audioCtx.createBiquadFilter();
                if (i === 0) band.type = 'lowshelf';
                else if (i === 9) band.type = 'highshelf';
                else { band.type = 'peaking'; band.Q.value = 1.0; }
                band.frequency.value = eqFreqs[i];
                band.gain.value = eqGains[i];
                eqBands.push(band);
            }

            limiterNode = audioCtx.createDynamicsCompressor();
            limiterNode.threshold.value = -1.0; 
            limiterNode.knee.value = 0.0; 
            limiterNode.ratio.value = 20.0; 
            limiterNode.attack.value = 0.002; 
            limiterNode.release.value = 0.1; 

            visualizerActive = true;
        } catch (e) { visualizerActive = false; }
        
        drawVisualizerLoop(canvas, ctx, audioPlayer, getState);
    }
    
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(e => {});
}

export function routeAudioGraph(useEq, isRelaxModeOn) {
    if (!source || !visualizerActive) return;
    try {
        source.disconnect(); splitter.disconnect(); merger.disconnect(); delayR.disconnect();
        agcNode.disconnect(); makeupGain.disconnect(); eqBands.forEach(band => band.disconnect());
        limiterNode.disconnect(); analyser.disconnect();
    } catch(e) {}

    if (useEq) {
        source.connect(splitter);
        splitter.connect(merger, 0, 0); 
        if (isRelaxModeOn) {
            splitter.connect(delayR, 1);
            delayR.connect(merger, 0, 1); 
        } else {
            splitter.connect(merger, 1, 1); 
        }
        merger.connect(agcNode);
        agcNode.connect(makeupGain);
        makeupGain.connect(eqBands[0]);
        for (let i = 0; i < 9; i++) eqBands[i].connect(eqBands[i+1]);
        eqBands[9].connect(limiterNode);
        limiterNode.connect(analyser); 
        analyser.connect(audioCtx.destination);
    } else {
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    }
}

function drawVisualizerLoop(canvas, ctx, audioPlayer, getState) {
    requestAnimationFrame(() => drawVisualizerLoop(canvas, ctx, audioPlayer, getState));
    
    const state = getState();
    const ring = document.getElementById('visualizerRing');
    const trackTimeDisplay = document.getElementById('trackTimeDisplay');

    let isActivePlayer = state.isPlaying && !state.isBufferingStatus && !state.isOfflineStatus && !state.isSwitchingQuality;

    if (!state.allowVisualizer) {
        canvas.style.opacity = '0'; ring.style.opacity = '0'; ring.classList.remove('fallback-pulse');
        if (trackTimeDisplay) trackTimeDisplay.style.opacity = '0';
        return;
    }

    if (!visualizerActive) {
        canvas.style.opacity = '0'; ring.style.opacity = '0.8'; ring.classList.add('fallback-pulse'); 
        if (trackTimeDisplay) trackTimeDisplay.style.opacity = '0';
        return;
    }

    canvas.style.opacity = '1'; ring.style.opacity = '0'; ring.classList.remove('fallback-pulse');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (isActivePlayer && audioDataArray) analyser.getByteFrequencyData(audioDataArray);
    else if (audioDataArray) audioDataArray.fill(0);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = 100; 
    const progressRadius = baseRadius + 14; 
    const vizStartRadius = progressRadius + 15;
    const maxBarHeight = 45; 

    let color1 = window.currentVisualizerPalette[0] || [74, 222, 128];
    let color2 = window.currentVisualizerPalette[1] || color1;

    let nowMs = Date.now();
    let simulatedElapsed = state.currentSongElapsed;
    if (isActivePlayer && state.currentSongDuration > 0 && window.lastSongUpdateTimeRefMs) {
        simulatedElapsed += ((nowMs - window.lastSongUpdateTimeRefMs) / 1000);
    }
    if (state.currentSongDuration > 0 && simulatedElapsed > state.currentSongDuration) simulatedElapsed = state.currentSongDuration;

    let progressRatio = 0;
    if (state.currentSongDuration > 0) {
        progressRatio = simulatedElapsed / state.currentSongDuration;
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
        ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(${color2[0]}, ${color2[1]}, ${color2[2]}, 0.8)`;
        ctx.stroke(); ctx.shadowBlur = 0;
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
            if (isSharp && smoothedVal > 50) currentRadius += (Math.random() - 0.5) * (smoothedVal * 0.2);

            let angle = i * angleStep + offsetAngle;
            points.push({ x: centerX + Math.cos(angle) * currentRadius, y: centerY + Math.sin(angle) * currentRadius });
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length; i++) {
            let pNext = points[(i + 1) % points.length];
            if (isSharp) ctx.lineTo(pNext.x, pNext.y);
            else {
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
        ctx.stroke(); ctx.shadowBlur = 0;
    }

    drawElectricWave(0, timeOffset * 0.5, 0.6, false);
    drawElectricWave(1, -timeOffset * 0.8, 1.0, true);
    drawElectricWave(2, timeOffset * 1.2, 0.8, false);
}
