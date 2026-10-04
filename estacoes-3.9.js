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
        "id": "Energy_brasil",
        "name": "Energy Brasil 98.FM",
        "description": "A sua Top 40",
        "logotipo": "player/logo.png",
        "api": "https://az11.yesstreaming.net/api/nowplaying/energy_brasil_98fm",
        "historyApi": "",
        "type": "azuracast",
        "record": "true",
        "intro": "https://cdn.wapka.org/00hkls/d69ae67ce2af62284bcfc9d8fc6cecd5/98-fm10.mp3", // jingle
        "limitHistory": 20,
        "contact": "https://wa.me/559191930858?text=Olá,%20preciso%20de%20atendimento!",
        "visualizer": "true",
        "equalizador": "true",
        "defaultArt": "player/cover(3).png",
        "bgdefaultArt": "player/cover(3).png",
        "streams": {
            "high": { "url": "https://az11.yesstreaming.net/listen/energy_brasil_98fm/nrjbrasil_128kbps.mp3", "format": "Alta qualidade" },
            "mid": { "url": "https://az11.yesstreaming.net/listen/energy_brasil_98fm/nrjbrasil_32kbps.mp3", "format": "Qualidade padrão" },
            "low": { "url": "", "format": "Qualidade Compactada" }
        }
    }
];
