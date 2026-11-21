/* Texturas de especialidade para a capa da ficha quando o fornecedor ainda não tem fotos.
   Cada textura é um pequeno desenho SVG repetido: identifica o tipo de serviço de relance
   (mármore, tacos, azulejo, tijolo...) e dá personalidade à ficha sem fingir ser uma foto. */
(function () {
  const svg = (w, h, body, bg) =>
    `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><rect width='${w}' height='${h}' fill='${bg}'/>${body}</svg>`)}")`;

  const T = {
    marmore: svg(260, 130,
      `<g fill='none' stroke-linecap='round'>
        <path d='M-10 30 C40 10 70 60 120 40 S200 0 270 35' stroke='#b7b9b6' stroke-width='2.2' opacity='.7'/>
        <path d='M-10 95 C30 80 80 120 140 92 S220 70 270 100' stroke='#c9cac6' stroke-width='1.4' opacity='.8'/>
        <path d='M60 -5 C70 30 50 60 75 135' stroke='#bfc1bd' stroke-width='1' opacity='.6'/>
        <path d='M180 -5 C170 40 200 70 185 135' stroke='#cdcfcb' stroke-width='.8' opacity='.7'/></g>`, '#eeede9'),
    piso: svg(180, 48,
      `<rect y='0' width='110' height='24' fill='#bd8c5b'/><rect x='110' y='0' width='70' height='24' fill='#c99a69'/>
       <rect y='24' width='50' height='24' fill='#b38251'/><rect x='50' y='24' width='130' height='24' fill='#c3925f'/>
       <g stroke='#86592f' stroke-width='1.5'><path d='M0 24H180M0 48H180M110 0V24M50 24V48'/></g>`, '#bd8c5b'),
    azulejo: svg(44, 44,
      `<rect x='3' y='3' width='38' height='38' fill='#f4f8f9'/><path d='M22 9l13 13-13 13L9 22z' fill='#d6e7ec'/>`, '#c9d8dc'),
    tijolo: svg(64, 32,
      `<g fill='#c0643f'><rect x='1' y='1' width='62' height='14'/><rect x='-31' y='17' width='62' height='14'/><rect x='33' y='17' width='62' height='14'/></g>
       <g fill='#b45734'><rect x='34' y='1' width='29' height='14'/><rect x='1' y='17' width='29' height='14'/></g>`, '#e8d9c8'),
    pintura: 'repeating-linear-gradient(-35deg, #fbefdd 0 16px, #f2c88f 16px 42px, #fbefdd 42px 56px, #e9a978 56px 70px, #f6dcb5 70px 86px)',
    gesso: svg(160, 80,
      `<g fill='none' stroke='#d9d6cf' stroke-width='2'><rect x='8' y='8' width='144' height='64' rx='2'/><rect x='18' y='18' width='124' height='44' rx='2'/></g>
       <circle cx='80' cy='40' r='5' fill='#fff7e6' stroke='#cfcac0'/>`, '#f3f2ee'),
    eletrica: svg(120, 80,
      `<g fill='none' stroke='#2f7a68' stroke-width='2'><path d='M0 20H40V50H90V20H120M20 80V60H60M100 0V35'/></g>
       <g fill='#7fe3c9'><circle cx='40' cy='20' r='3.5'/><circle cx='90' cy='50' r='3.5'/><circle cx='60' cy='60' r='3.5'/><circle cx='100' cy='35' r='3.5'/></g>`, '#0f3d34'),
    hidraulica: svg(140, 70,
      `<g fill='none' stroke='#c77a45' stroke-width='9'><path d='M0 20H140M0 54H140M70 20V54'/></g>
       <g fill='#a8622f'><rect x='62' y='12' width='16' height='16' rx='3'/><rect x='62' y='46' width='16' height='16' rx='3'/>
       <rect x='18' y='14' width='6' height='12' rx='1.5'/><rect x='116' y='48' width='6' height='12' rx='1.5'/></g>`, '#eef3f4'),
    madeira: svg(200, 60,
      `<g fill='none' stroke='#a46f3f' stroke-width='1.4' opacity='.8'>
        <path d='M0 10 C50 4 90 16 140 9 S190 6 200 10'/><path d='M0 24 C40 30 100 18 150 26 S190 30 200 24'/>
        <path d='M0 40 C60 34 110 46 160 38 S195 36 200 40'/><path d='M0 53 C50 58 90 49 140 55 S185 57 200 53'/>
        <ellipse cx='120' cy='31' rx='14' ry='5'/></g>`, '#c8955f'),
    vidro: 'repeating-linear-gradient(115deg, #d7ebf2 0 46px, rgba(255,255,255,.75) 46px 58px, #d7ebf2 58px 72px, rgba(255,255,255,.55) 72px 76px, #d7ebf2 76px 120px)',
    telha: svg(40, 24,
      `<path d='M0 24 A20 20 0 0 1 40 24z' fill='#c4532f'/><path d='M-20 12 A20 20 0 0 1 20 12z M20 12 A20 20 0 0 1 60 12z' fill='#b4482a'/>`, '#a5401f'),
    metal: svg(32, 32,
      `<path d='M16 0L32 16L16 32L0 16z' fill='none' stroke='#6c7574' stroke-width='3'/>`, '#9aa3a2'),
    jardim: svg(80, 80,
      `<g fill='#4f9a5d'><ellipse cx='20' cy='20' rx='14' ry='6' transform='rotate(-35 20 20)'/><ellipse cx='60' cy='55' rx='14' ry='6' transform='rotate(30 60 55)'/>
       <ellipse cx='58' cy='14' rx='9' ry='4' transform='rotate(15 58 14)'/><ellipse cx='18' cy='62' rx='9' ry='4' transform='rotate(-20 18 62)'/></g>`, '#2f6b3f'),
    agua: svg(60, 60,
      `<g fill='#8cc3e3'><path d='M15 8c5 8 8 12 8 16a8 8 0 0 1-16 0c0-4 3-8 8-16z'/><path d='M45 34c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z'/></g>`, '#e1f0f8'),
    ar: svg(120, 40,
      `<g fill='none' stroke='#a9d3e2' stroke-width='2.5' stroke-linecap='round'><path d='M0 12 C20 2 40 22 60 12 S100 2 120 12'/><path d='M0 30 C20 20 40 40 60 30 S100 20 120 30'/></g>`, '#eaf5f9'),
    padrao: svg(48, 48,
      `<path d='M24 14l2.9 6 6.6.9-4.8 4.6 1.2 6.5L24 28.9 18.1 32l1.2-6.5-4.8-4.6 6.6-.9z' fill='#ffffff' opacity='.14'/>`, '#1d6a52')
  };

  const REGRAS = [
    [/marmor|granit|quartzo|pedra/, 'marmore'],
    [/piso|porcelan|taco|assoalho|laminad|vinilic/, 'piso'],
    [/azulej|revest|rejunt|ceramic/, 'azulejo'],
    [/pedreir|alvenar|constru|reboc|tijol/, 'tijolo'],
    [/pint|textur|grafiat/, 'pintura'],
    [/gess|drywall|sanca|forro/, 'gesso'],
    [/eletric|eletrici|ilumina/, 'eletrica'],
    [/encan|hidraul|bombeir|cano|esgot/, 'hidraulica'],
    [/marcen|movel|moveis|montad|carpint|madeir/, 'madeira'],
    [/vidr|box|espelh|janel/, 'vidro'],
    [/telh|calha|cobertur/, 'telha'],
    [/serralh|solda|portao|grade|ferr|metal/, 'metal'],
    [/jardin|paisag|grama|poda/, 'jardim'],
    [/impermeab|infiltr|vazament/, 'agua'],
    [/ar-cond|ar cond|climat|refriger/, 'ar']
  ];
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // Usa a primeira especialidade do fornecedor que tenha uma textura própria.
  window.texturaDe = function (especialidades) {
    for (const e of especialidades || []) {
      const n = norm(e);
      for (const [re, k] of REGRAS) if (re.test(n)) return T[k];
    }
    return T.padrao;
  };
})();
