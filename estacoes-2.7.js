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
        "name": "Belém 98 FM",
        "description": "O Top 40 do Brasil e do mundo",
        "logotipo": "https://www.98fm.com/images/red-logo.svg",
        "api": "https://az11.yesstreaming.net:8300",
        "historyApi": "",
        "type": "shoutcast",
        "record": "true",
        "intro": "https://wisebuddahjingles.com/media/9888/lo.mp3", // jingle
        "limitHistory": 20,
        "contact": "https://wa.me/559191930858?text=Olá,%20preciso%20de%20atendimento!",
        "visualizer": "true",
        "defaultArt": "https://energybrasil.xtgem.com/app_web.jpg",
        "bgdefaultArt": "https://energybrasil.xtgem.com/app_web.jpg",
        "streams": {
            "high": { "url": "", "format": "Alta qualidade" },
            "mid": { "url": "https://az11.yesstreaming.net/listen/dublins_brasil_98fm/dublinbrasil.mp3", "format": "Qualidade padrão" },
            "low": { "url": "https://az11.yesstreaming.net/listen/dublins_brasil_98fm/dublinbrasil_mobile.aac", "format": "Qualidade Compactada" }
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
        "defaultArt": "https://media.radiocms.net/uploads/2023/01/25105148/98FM_Web-Image-98FM-DBMM.png",
        "bgdefaultArt": "https://media.radiocms.net/uploads/2023/01/25105148/98FM_Web-Image-98FM-DBMM.png",
        "streams": {
            "high": { "url": "https://live-bauerie.sharp-stream.com/98", "format": "Alta qualidade" },
            "mid": { "url": "", "format": "Qualidade padrão" },
            "low": { "url": "", "format": "Qualidade Compactada" }
        }
    } 
];
