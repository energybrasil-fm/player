(function() {
    // Alvo: Hoje às 23:59
    const dataAlvo = new Date();
    dataAlvo.setHours(23, 59, 0, 0);

    // Se já passou das 23:59 de hoje, encerra o script imediatamente e não bloqueia nada
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

        // Se o tempo esgotar enquanto o usuário está na página, remove o bloqueio
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
                padding: '40px',
                borderRadius: '12px',
                border: '1px solid #222222',
                textAlign: 'center',
                maxWidth: '450px',
                width: '90%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
            });

            // Ícone visual estático
            const icon = document.createElement('div');
            icon.innerHTML = '⚙️';
            icon.style.fontSize = '50px';
            icon.style.marginBottom = '20px';

            // Título informativo
            const title = document.createElement('h2');
            title.innerText = 'Sistema em Manutenção';
            Object.assign(title.style, {
                margin: '0 0 15px 0',
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 'bold'
            });

            // Mensagem
            const message = document.createElement('p');
            message.innerText = 'Estamos realizando atualizações críticas. O sistema retornará automaticamente em:';
            Object.assign(message.style, {
                margin: '0 0 20px 0',
                color: '#aaaaaa',
                lineHeight: '1.6',
                fontSize: '16px'
            });

            // 3. O Relógio / Contador Regressivo
            const timerDisplay = document.createElement('div');
            timerDisplay.id = 'manutencao-relogio';
            timerDisplay.innerText = formatarTempo(restante);
            Object.assign(timerDisplay.style, {
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#007BFF',
                letterSpacing: '2px',
                fontFamily: 'Courier New, monospace',
                backgroundColor: '#1a1a1a',
                padding: '15px',
                borderRadius: '6px',
                display: 'inline-block'
            });

            popup.appendChild(icon);
            popup.appendChild(title);
            popup.appendChild(message);
            popup.appendChild(timerDisplay);
            overlay.appendChild(popup);
            
            if (document.body) {
                document.body.appendChild(overlay);
            }
        } else {
            // Se o overlay já existe, apenas atualiza o relógio interno
            const relogio = document.getElementById('manutencao-relogio');
            if (relogio) relogio.innerText = formatarTempo(restante);
        }

        if (document.body) {
            document.body.style.setProperty('overflow', 'hidden', 'important');
            document.body.style.setProperty('background', '#000000', 'important');
        }
    }

    // Inicialização do script
    if (document.body) {
        aplicarBloqueio();
    } else {
        window.addEventListener('DOMContentLoaded', aplicarBloqueio);
    }

    // Atualiza o relógio a cada 1 segundo
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
