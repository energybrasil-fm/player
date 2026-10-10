(function() {
    // Alvo: Hoje às 23:59
    const dataAlvo = new Date();
    dataAlvo.setHours(23, 59, 0, 0);

    // Se já passou das 23:59 de hoje, encerra o script imediatamente
    if (new Date().getTime() >= dataAlvo.getTime()) {
        return;
    }

    // Força a ocultação imediata do conteúdo caso o script rode antes do body carregar por completo
    const styleForce = document.createElement('style');
    styleForce.id = 'manutencao-style-force';
    styleForce.innerText = 'html, body { overflow: hidden !important; background: #000000 !important; }';
    document.head.appendChild(styleForce);

    let intervaloContagem;

    function formatarTempo(ms) {
        const totalSegundos = Math.floor(ms / 1000);
        const horas = Math.floor(totalSegundos / 3600);
        const minutos = Math.floor((totalSegundos % 3600) / 60);
        const segundos = totalSegundos % 60;

        return [
            horas.toString().padStart(2, '0'),
            minutos.toString().padStart(2, '0'),
            segundos.toString().padStart(2, '0')
        ].join(':');
    }

    function encerrarManutencao() {
        clearInterval(intervaloContagem);
        observer.disconnect();
        
        const elemento = document.getElementById('manutencao-bloqueio-total');
        if (elemento) elemento.remove();
        
        const estilo = document.getElementById('manutencao-style-force');
        if (estilo) estilo.remove();

        if (document.body) {
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('background');
        }
    }

    function aplicarBloqueio() {
        const agora = new Date().getTime();
        const restante = dataAlvo.getTime() - agora;

        if (restante <= 0) {
            encerrarManutencao();
            return;
        }

        let overlay = document.getElementById('manutencao-bloqueio-total');
        
        if (!overlay) {
            // 1. Container de fundo 100% Escuro
            overlay = document.createElement('div');
            overlay.id = 'manutencao-bloqueio-total';
            
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                backgroundColor: '#000000',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: '999999999',
                fontFamily: 'Arial, sans-serif',
                userSelect: 'none',
                pointerEvents: 'all'
            });

            // 2. Caixa do Popup Centralizado
            const popup = document.createElement('div');
            Object.assign(popup.style, {
                backgroundColor: '#111111',
                padding: '30px',
                borderRadius: '12px',
                border: '1px solid #222222',
                textAlign: 'center',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
            });

            // Cabeçalho fixo interno
            const header = document.createElement('div');
            header.innerHTML = '<div style="font-size: 40px; margin-bottom: 10px;">⚙️</div>' +
                               '<h2 style="margin: 0 0 10px 0; color: #ffffff; font-size: 22px; font-weight: bold;">Sistema em Manutenção</h2>' +
                               '<p style="margin: 0 0 15px 0; color: #aaaaaa; line-height: 1.4; font-size: 14px;">Estamos implantando atualizações críticas. O sistema retornará em:</p>';
            popup.appendChild(header);

            // 3. O Relógio / Contador Regressivo
            const timerDisplay = document.createElement('div');
            timerDisplay.id = 'manutencao-relogio';
            timerDisplay.innerText = formatarTempo(restante);
            Object.assign(timerDisplay.style, {
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#007BFF',
                letterSpacing: '2px',
                fontFamily: 'Courier New, monospace',
                backgroundColor: '#1a1a1a',
                padding: '10px 20px',
                borderRadius: '6px',
                display: 'inline-block',
                margin: '0 auto 20px auto'
            });
            popup.appendChild(timerDisplay);

            // Divisor visual
            const hr = document.createElement('div');
            Object.assign(hr.style, {
                height: '1px',
                backgroundColor: '#222222',
                margin: '0 0 15px 0'
            });
            popup.appendChild(hr);

            // Título das Notas
            const notesTitle = document.createElement('h3');
            notesTitle.innerText = 'Notas da Atualização:';
            Object.assign(notesTitle.style, {
                color: '#007BFF',
                fontSize: '14px',
                textAlign: 'left',
                margin: '0 0 10px 0',
                textTransform: 'uppercase',
                letterSpacing: '1px'
            });
            popup.appendChild(notesTitle);

            // 4. Área de Notas de Atualização com Scroll Interno Autônomo
            const notesContainer = document.createElement('div');
            Object.assign(notesContainer.style, {
                textAlign: 'left',
                backgroundColor: '#161616',
                padding: '15px',
                borderRadius: '6px',
                overflowY: 'auto',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#dddddd',
                flex: '1'
            });

            // Estrutura organizada por categorias
            notesContainer.innerHTML = `
                <b style="color: #4ade80;">🚀 Novidades & Design:</b>
                <ul style="margin: 5px 0 15px 20px; padding: 0; list-style-type: disc;">
                    <li>Novo design do player versão 5.6 build 7</li>
                    <li>Adicionada a função de favoritos</li>
                    <li>Novo waves visualizer circular</li>
                    <li>Novo preset de equalização</li>
                    <li>Adicionada função Dolby Audio ao menu</li>
                    <li>Nova barra de progresso circular em volta da capa</li>
                    <li>Novo formato de duração das faixas sobre a capa do player</li>
                </ul>
                <b style="color: #60a5fa;">🔧 Integrações & Correções:</b>
                <ul style="margin: 5px 0 15px 20px; padding: 0; list-style-type: disc;">
                    <li>Adicionado novos endpoints e corrigidos os endpoints Icecast/Shoutcast</li>
                    <li>Corrigido o erro de fallback do player ao obter as capas do iTunes</li>
                    <li>Corrigidos os travamentos das opções de qualidade de áudio</li>
                </ul>
                <b style="color: #f87171;">🗑️ Remoções & Otimizações:</b>
                <ul style="margin: 5px 0 0 20px; padding: 0; list-style-type: disc;">
                    <li>Removida a função fade e atrasos do player como +10s e -10s</li>
                    <li>Removida a função de cache que comprometia o app ocasionando erros</li>
                </ul>
            `;
            popup.appendChild(notesContainer);
            overlay.appendChild(popup);
            
            if (document.body) {
                document.body.appendChild(overlay);
            }
        } else {
            const relogio = document.getElementById('manutencao-relogio');
            if (relogio) relogio.innerText = formatarTempo(restante);
        }

        if (document.body) {
            document.body.style.setProperty('overflow', 'hidden', 'important');
            document.body.style.setProperty('background', '#000000', 'important');
        }
    }

    if (document.body) {
        aplicarBloqueio();
    } else {
        window.addEventListener('DOMContentLoaded', aplicarBloqueio);
    }

    intervaloContagem = setInterval(aplicarBloqueio, 1000);

    // ANTIDELEÇÃO AVANÇADA (MutationObserver)
    const observer = new MutationObserver(() => {
        const elemento = document.getElementById('manutencao-bloqueio-total');
        
        if (!elemento || 
            elemento.style.display === 'none' || 
            elemento.style.visibility === 'hidden' || 
            parseFloat(elemento.style.opacity) < 1 ||
            elemento.style.zIndex !== '999999999' ||
            document.body.style.overflow !== 'hidden') {
            
            aplicarBloqueio();
        }
    });

    observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
})();
