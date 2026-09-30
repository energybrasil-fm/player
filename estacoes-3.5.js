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
        "logotipo": "https://energybrasil.xtgem.com/energy_brasil/logo.png",
        "api": "https://az11.yesstreaming.net/api/nowplaying/energy_brasil_98fm",
        "historyApi": "",
        "type": "azuracast",
        "record": "true",
        "intro": "https://cdn.wapka.org/00hkls/d69ae67ce2af62284bcfc9d8fc6cecd5/98-fm10.mp3", // jingle
        "limitHistory": 20,
        "contact": "https://wa.me/559191930858?text=Olá,%20preciso%20de%20atendimento!",
        "visualizer": "true",
        "equalizador": "true",
        "defaultArt": "https://energybrasil.xtgem.com/energy_brasil/cover.png",
        "bgdefaultArt": "https://energybrasil.xtgem.com/energy_brasil/cover.png",
        "streams": {
            "high": { "url": "https://az11.yesstreaming.net/listen/energy_brasil_98fm/nrjbrasil_128kbps.mp3", "format": "Alta qualidade" },
            "mid": { "url": "https://az11.yesstreaming.net/listen/energy_brasil_98fm/nrjbrasil_32kbps.mp3", "format": "Qualidade padrão" },
            "low": { "url": "", "format": "Qualidade Compactada" }
        }
    },
    {
        "id": "Dublin's_98fm",
        "name": "Dublin's 98 FM",
        "description": "Dublin's Best Music Mix",
        "logotipo": "https://www.98fm.com/images/red-logo.svg",
        "api": "https://api.instant.audio/data/playlist/97/98fm",
        "historyApi": "",
        "type": "instant",
        "record": "true",
        "intro": "https://wisebuddahjingles.com/media/14208/lo.mp3", // jingle
        "limitHistory": 20,
        "contact": "https://wa.me/559191930858?text=Olá,%20preciso%20de%20atendimento!",
        "visualizer": "true",
        "equalizador": "false",
        "defaultArt": "https://energybrasil.xtgem.com/energy_brasil/dublins.jpg",
        "bgdefaultArt": "https://energybrasil.xtgem.com/energy_brasil/dublins.jpg",
        "streams": {
            "high": { "url": "https://live-bauerie.sharp-stream.com/98", "format": "Alta qualidade" },
            "mid": { "url": "", "format": "Qualidade padrão" },
            "low": { "url": "", "format": "Qualidade Compactada" }
        }
    } 
];
