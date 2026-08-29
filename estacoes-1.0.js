// ==========================================
// estacoes.js
// JSON DE CONFIGURAÇÃO DE ESTAÇÕES MULTIPLAS COM DESCRIÇÃO 
// para shoutcast/icecast use os termos específicos.
// shoutcast V2: API: "<IP>:<porta>/stats?sid=id&json=1" historyAPI: "<IP>:<porta>/played.html"
// icecast: API: "<IP>:<porta>/status-json.xsl"
// Nota: o histórico de músicas para shoutcast/icecast sem historyApi será gerado conforme as faixas tocadas no player durante a transmissão.
// ==========================================

export const stations = [
    {
        "id": "jam_charts",
        "name": "JAM FM",
        "description": "Deine Nr. 1 für neue Musik",
        "logotipo": "https://www.jam.fm/assets/icons/logo.svg?token=v2",
        "api": "https://www.jam.fm/services/program-info/history/jam/nmr/0/20/17?items=6",
        "historyApi": "",
        "type": "jamfm",
        "record": "false", // false para bloquear a gravação, true para habilitar
        "limitHistory": 10,
        "contact": "https://www.facebook.com/radiojamfm",
        "visualizer": "true",
        "defaultArt": "https://static.jam.fm/img/1311/647006/500000/o/480/480/jamfm_streamcover_3000x3000.png",
        "bgdefaultArt": "https://static.jam.fm/img/1311/647006/500000/o/480/480/jamfm_streamcover_3000x3000.png",
        "streams": {
            "high": { "url": "https://stream.jam.fm/jamfm-live/mp3-192/App/", "format": "Alta qualidade" },
            "mid": { "url": "https://stream.jam.fm/jamfm-live/mp3-128/App/", "format": "Qualidade padrão" },
            "low": { "url": "https://stream.jam.fm/jamfm-live/aac-64/App/", "format": "Qualidade Compactada" }
        }
    },
    {
        "id": "jam_2010er",
        "name": "JAM FM (2010er)",
        "description": "2010er Hits nonstop",
        "logotipo": "https://www.jam.fm/assets/icons/logo.svg?token=v2",
        "api": "https://www.jam.fm/services/program-info/history/jam/jam_2010er/0/19/40?items=6",
        "historyApi": "",
        "type": "jamfm",
        "record": "true",
        "limitHistory": 10,
        "contact": "https://www.facebook.com/radiojamfm",
        "visualizer": "true",
        "defaultArt": "https://static.jam.fm/img/8705/227201/764000/o/480/480/image.png",
        "bgdefaultArt": "https://static.jam.fm/img/1311/647006/500000/o/480/480/jamfm_streamcover_3000x3000.png",
        "streams": {
            "high": { "url": "https://stream.jam.fm/2010er/mp3-192/App/", "format": "Alta qualidade" },
            "mid": { "url": "https://stream.jam.fm/2010er/mp3-128/App/", "format": "Qualidade padrão" },
            "low": { "url": "https://stream.jam.fm/2010er/aac-64/App/", "format": "Qualidade Compactada" }
        }
    },
{
        "id": "kiis_fm",
        "name": "102.7 KIIS-FM Music",
        "description": "LA's #1 Hit Music Station",
        "logotipo": "https://upload.wikimedia.org/wikipedia/commons/f/f4/1027_KIIS-FM_2015.png",
        "api": "https://us.api.iheart.com/api/v3/live-meta/stream/185/trackHistory?limit=20&useNewTimeFormat=true",
        "historyApi": "",
        "type": "iheart",
         "record": "false",
        "limitHistory": 10,
        "contact": "https://x.com/share?related=iHeartRadio&text=I%27m+listening+to+102.7+KIIS+FM+Los+Angeles+%E2%99%AB+%40iHeartRadio&url=https%3A%2F%2Fwww.iheart.com%2Flive%2F1027-kiis-fm-los-angeles-185",
        "visualizer": "true",
        "defaultArt": "https://reelworld.com/assets/images/marketing/jingles/kiis-2022/tile.jpg",
        "bgdefaultArt": "https://reelworld.com/assets/images/marketing/jingles/kiis-2022/tile.jpg",
        "streams": {
            "high": { "url": "", "format": "Alta qualidade" },
            "mid": { "url": "", "format": "Qualidade padrão" },
            "low": { "url": "https://cloud.revma.ihrhls.com/zc185?rj-org=n2cb-e2&rj-ttl=5&rj-tok=AAABoC7mA8YA_ZdqehlI-C1F1A", "format": "Qualidade Compactada" }
        }
    },
{
        "id": "NRJ_fm",
        "name": "NRJ",
        "description": "Hit Music Only!",
        "logotipo": "https://radiomap.eu/fr/images/nrj.svg",
        "api": "https://players.nrjaudio.fm/wr_api/live/fr?act=get_plist&id_wr=158&fmt=json&sg_memory",
        "historyApi": "",
        "type": "nrj",
        "limitHistory": 10,
        "record": "true",
        "contact": "https://fr-fr.facebook.com/nrjradio",
        "visualizer": "true",
        "defaultArt": "https://cdn-profiles.tunein.com/s293289/images/bannerx.jpg?t=639190166580000000",
        "bgdefaultArt": "https://cdn-profiles.tunein.com/s293289/images/bannerx.jpg?t=639190166580000000",
        "streams": {
            "high": { "url": "https://streaming.nrjaudio.fm/oumvmk8fnozc?origine=playernrj", "format": "Alta qualidade" },
            "mid": { "url": "", "format": "Qualidade padrão" },
            "low": { "url": "https://streaming.nrjaudio.fm/oufdfatx4thg?origine=playernrj", "format": "Qualidade Compactada" }
        }
    },
{
        "id": "Channel_R",
        "name": "Channel R.",
        "description": "Your Hits! Your Station.",
        "logotipo": "https://channelrradio.com/wp-content/uploads/2026/05/iHeartChannelRLogo-2-768x768.png",
        "api": "https://api.live365.com/station/a23165?_=1787961063144",
        "historyApi": "",
        "type": "live365",
        "limitHistory": 10,
        "record": "false",
        "contact": "https://www.facebook.com/Channel-R-Todays-Hits-103329647910419",
        "visualizer": "true",
        "defaultArt": "https://media.live365.com/download/10bff51d-2e67-4ecf-90f6-196c345c0018.png",
        "bgdefaultArt": "https://media.live365.com/download/10bff51d-2e67-4ecf-90f6-196c345c0018.png",
        "streams": {
            "high": { "url": "https://streaming.live365.com/a23165_2", "format": "Alta qualidade" },
            "mid": { "url": "https://streaming.live365.com/a23165", "format": "Qualidade padrão" },
            "low": { "url": "", "format": "Qualidade Compactada" }
        }
    },
{
        "id": "ZFM_RADIO",
        "name": "ZFM",
        "description": "Auckland's Hit Music Station",
        "logotipo": "https://www.radio.net/175/zfm.png?version=6aa5a8180a9a307778d606b0ba55da21a8d2cda5",
        "api": "https://nebula.shoutca.st:2199/rpc/zfm0/streaminfo.get?_=1787962576604",
        "historyApi": "https://nebula.shoutca.st:2199/rpc/zfm0/recenttracks.get?_=1787962576611",
        "type": "zfm",
        "limitHistory": 10,
        "record": "false",
        "contact": "https://instagram.com/dylangarrod",
        "visualizer": "true",
        "defaultArt": "https://www.getmeradio.com/stations/zfm-non-stop-1515/logos/512x512.png",
        "bgdefaultArt": "https://www.getmeradio.com/stations/zfm-non-stop-1515/logos/512x512.png",
        "streams": {
            "high": { "url": "", "format": "Alta qualidade" },
            "mid": { "url": "https://zfm0.radioca.st/stream", "format": "Qualidade padrão" },
            "low": { "url": "https://nebula.shoutca.st:2199", "format": "Qualidade Compactada" }
        }
    },
{
        "id": "EHR_RADIO",
        "name": "EHR TOP 40",
        "description": "European Hit Radio",
        "logotipo": "https://www.ehr.fm/svg/logo.svg",
        "api": "https://www.ehr.fm/api/channels/now_playing_all",
        "historyApi": "",
        "type": "ehr",
        "limitHistory": 10,
        "record": "false",
        "contact": "https://www.facebook.com/europeanhitradio",
        "visualizer": "true",
        "defaultArt": "https://play-lh.googleusercontent.com/vDIvuXfSf3_xrn_OS4I2H5OEwUwrOt9QTkNrNvZqWit_6uRECZpGk85YUud-0EX_TlMDs8w5qGlbPl7umLXk=w480-h960",
        "bgdefaultArt": "https://play-lh.googleusercontent.com/vDIvuXfSf3_xrn_OS4I2H5OEwUwrOt9QTkNrNvZqWit_6uRECZpGk85YUud-0EX_TlMDs8w5qGlbPl7umLXk=w480-h960",
        "streams": {
            "high": { "url": "", "format": "Alta qualidade" },
            "mid": { "url": "", "format": "Qualidade padrão" },
            "low": { "url": "https://23623.live.streamtheworld.com/EHRAAC.aac?sbmid=73b223bb-ecc0-411c-b89e-95ebca0b5b91&gdpr=1&lsid=cookie%3A5236718c-0a45-4620-a629-eaec324238ed&gdpr_consent=", "format": "Qualidade Compactada" }
        }
    },
{
        "id": "TOP_40RADIO",
        "name": "Radio Top 40",
        "description": "Top Summer Vibes",
        "logotipo": "https://www.radiotop40.de/images/logo.png",
        "api": "https://cache-1.konsole-labs.com/ctrl-api/getCurrentSong?k=RT1",
        "historyApi": "https://cache-1.konsole-labs.com/ctrl-api/getPlaylist?k=RT1&typ=hour",
        "type": "radiotop40",
        "limitHistory": 10,
        "record": "false",
        "contact": "https://www.instagram.com/radiotop40/#",
        "visualizer": "true",
        "defaultArt": "https://www.radiotop40.de/images/fallback/default-1x1.svg",
        "bgdefaultArt": "https://www.radiotop40.de/images/fallback/default-1x1.svg",
        "streams": {
            "high": { "url": "", "format": "Alta qualidade" },
            "mid": { "url": "", "format": "Qualidade padrão" },
            "low": { "url": "https://edge80.streamonkey.net/antthue-radiotop40?aggregator=app&nocache=1787790736436&aw_0_1st.playerid=web-konsole-labs&listenerid=4d4fee0f-22a9-43b7-9733-d9f1acb98866", "format": "Qualidade Compactada" }
        }
    },
{
        "id": "esperanca_fm",
        "name": "Esperança FM",
        "description": "Luz para a vida!",
        "logotipo": "https://esperanca.live/portal/wp-content/uploads/2026/04/logo-esperanca.png",
        "api": "https://stream03.dghost.com.br:8180/status-json.xsl",
        "historyApi": "",
        "type": "icecast",
        "record": "false",
        "limitHistory": 10,
        "contact": "malito:contato@radioesperanca.net.br",
        "visualizer": "false",
        "defaultArt": "https://esperanca.live/logo_principal2.png",
        "bgdefaultArt": "https://esperanca.live/logo_principal2.png",
        "streams": {
            "high": { "url": "https://stream03.dghost.com.br:8180/es_sd", "format": "Alta qualidade" },
            "mid": { "url": "", "format": "Qualidade padrão" },
            "low": { "url": "https://stm24.srvaudio.com.br:11816/;", "format": "Qualidade Compactada" }
        }
    },
{
        "id": "star_108",
        "name": "STAR 108",
        "description": "The Sound of Now",
        "logotipo": "https://static.inonda.com/988/RES/player/km8AKAPunz-cover-600,600.PNG",
        "api": "https://api.xdevel.com/share/songinfo?clientId=7ac2975dab835638503710d96683f784e2bffeb2&inondaPlayerId=player-2224&1787965197237",
        "historyApi": "",
        "type": "star",
        "record": "false",
        "limitHistory": 10,
        "contact": "malito:contato@radioesperanca.net.br",
        "visualizer": "true",
        "defaultArt": "https://static.inonda.com/988/RES/player/km8AKAPunz-cover-600,600.PNG",
        "bgdefaultArt": "https://static.inonda.com/988/RES/player/km8AKAPunz-cover-600,600.PNG",
        "streams": {
            "high": { "url": "", "format": "Alta qualidade" },
            "mid": { "url": "https://onair7.xdevel.com/proxy/xautocloud_7d3o_988?mp=/;stream/;", "format": "Qualidade padrão" },
            "low": { "url": "", "format": "Qualidade Compactada" }
        }
    }
];
