// ==========================================
// estacoes.js
// JSON DE CONFIGURAÇÃO DE ESTAÇÕES MULTIPLAS COM DESCRIÇÃO 
// para shoutcast/icecast use os termos específicos.
// shoutcast V2: API: "<IP>:<porta>" historyAPI: "<IP>:<porta>"
// icecast: API: "<IP>:<porta>/status-json.xsl" ou "<IP>:<porta>"
// Nota: o histórico de músicas para shoutcast/icecast sem historyApi será gerado conforme as faixas tocadas no player durante a transmissão.
// ==========================================

export const stations = [
    {
        "id": "Dublin's_brasil",
        "name": "Dublin's Brasil 98.FM",
        "description": "A Top 40 do Brasil",
        "logotipo": "https://www.98fm.com/images/red-logo.svg",
        "api": "https://az11.yesstreaming.net:8300",
        "historyApi": "",
        "type": "shoutcast",
        "record": "true",
        "intro": "https://wisebuddahjingles.com/media/14208/lo.mp3", // jingle
        "limitHistory": 20,
        "contact": "https://wa.me/559191930858?text=Olá,%20preciso%20de%20atendimento!",
        "visualizer": "true",
        "defaultArt": "https://assets.radioplayer.org/372/37218/600/600/la2q4l57.png",
        "bgdefaultArt": "https://assets.radioplayer.org/372/37218/600/600/la2q4l57.png",
        "streams": {
            "high": { "url": "", "format": "Alta qualidade" },
            "mid": { "url": "https://az11.yesstreaming.net/listen/dublins_brasil_98fm/dublinbrasil.mp3", "format": "Qualidade padrão" },
            "low": { "url": "https://az11.yesstreaming.net/listen/dublins_brasil_98fm/dublinbrasil_mobile.aac", "format": "Qualidade Compactada" }
        }
    } 
];
