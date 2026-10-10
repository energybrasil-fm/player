(function() {
    // Força a ocultação imediata do conteúdo caso o script rode antes do body carregar por completo
    const styleForce = document.createElement('style');
    styleForce.innerText = 'html, body { overflow: hidden !important; background: #000000 !important; }';
    document.head.appendChild(styleForce);

    function aplicarBloqueio() {
        // Remove qualquer tentativa de burla anterior para reinjetar o bloco limpo
        const antigo = document.getElementById('manutencao-bloqueio-total');
        if (antigo) antigo.remove();

        // 1. Container de fundo 100% Escuro (Impossível ver o fundo)
        const overlay = document.createElement('div');
        overlay.id = 'manutencao-bloqueio-total';
        
        // Estilos de isolamento absoluto e visual totalmente oculto
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000000', // Preto absoluto e opaco
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999999999', // Prioridade máxima absoluta
            fontFamily: 'Arial, sans-serif',
            userSelect: 'none',
            pointerEvents: 'all'
        });

        // 2. Caixa do Popup Centralizado
        const popup = document.createElement('div');
        Object.assign(popup.style, {
            backgroundColor: '#111111', // Fundo escuro interno
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
        icon.innerHTML = '⚠️';
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

        // Mensagem com o prazo obrigatório de 24h
        const message = document.createElement('p');
        message.innerText = 'Estamos realizando atualizações críticas em nossa infraestrutura. O sistema estará totalmente disponível até ás 23h59.';
        Object.assign(message.style, {
            margin: '0',
            color: '#aaaaaa',
            lineHeight: '1.6',
            fontSize: '16px'
        });

        // Montagem do DOM
        popup.appendChild(icon);
        popup.appendChild(title);
        popup.appendChild(message);
        overlay.appendChild(popup);
        
        if (document.body) {
            document.body.appendChild(overlay);
            document.body.style.setProperty('overflow', 'hidden', 'important');
            document.body.style.setProperty('background', '#000000', 'important');
        }
    }

    // Inicialização segura do script
    if (document.body) {
        aplicarBloqueio();
    } else {
        window.addEventListener('DOMContentLoaded', aplicarBloqueio);
    }

    // ANTIDELEÇÃO AVANÇADA (MutationObserver): Detecta alterações no DOM instantaneamente
    const observer = new MutationObserver(() => {
        const elemento = document.getElementById('manutencao-bloqueio-total');
        
        // Se o elemento sumiu ou se mudaram propriedades de visibilidade/estilo, reaplica tudo na hora
        if (!elemento || 
            elemento.style.display === 'none' || 
            elemento.style.visibility === 'hidden' || 
            parseFloat(elemento.style.opacity) < 1 ||
            elemento.style.zIndex !== '999999999' ||
            document.body.style.overflow !== 'hidden') {
            
            aplicarBloqueio();
        }
    });

    // Configura o observer para vigiar o corpo da página e seus atributos
    observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });

    // Varredura extra redundante via timer a cada 500ms contra desativação manual do Observer
    setInterval(() => {
        if (!document.getElementById('manutencao-bloqueio-total')) {
            aplicarBloqueio();
        }
    }, 500);
})();
