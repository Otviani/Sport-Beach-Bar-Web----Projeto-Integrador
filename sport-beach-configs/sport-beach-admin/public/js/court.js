// public/js/court.js
// Desenho da quadra em SVG. Usado na página pública (somente leitura)
// e no painel do administrador (com a bolinha para arrastar).

const COURT = {
  P: 16,          // pixels por metro (escala fixa, para o arrastar ficar estável)
  X0: 70,         // margem esquerda do desenho
  Y0: 60,         // margem superior do desenho
  LEN: [6, 30],   // limites de comprimento (m) — iguais aos do servidor
  WID: [4, 16]    // limites de largura (m) — iguais aos do servidor
};

function formatMeters(n) {
  return String(n).replace('.', ',');
}

function courtAreaText(len, wid) {
  return `${(len * wid).toLocaleString('pt-BR')} m²`;
}

function courtSvg(len, wid, editable) {
  const { P, X0, Y0 } = COURT;
  const w = len * P;
  const h = wid * P;
  const mx = X0 + w / 2;
  const label = `${formatMeters(len)} m × ${formatMeters(wid)} m`;

  return `<svg viewBox="0 0 600 360" role="img" aria-label="Quadra de ${label}">
    <rect x="${X0}" y="${Y0}" width="${w}" height="${h}" fill="#f2dcae" stroke="#fff" stroke-width="4" rx="3"/>
    <line x1="${mx}" y1="${Y0 - 10}" x2="${mx}" y2="${Y0 + h + 10}" stroke="#12242b" stroke-width="3" stroke-dasharray="6 4"/>
    <circle cx="${mx}" cy="${Y0 - 10}" r="4" fill="#12242b"/>
    <circle cx="${mx}" cy="${Y0 + h + 10}" r="4" fill="#12242b"/>
    <text x="${mx}" y="${Y0 + h / 2 + 4}" text-anchor="middle" font-size="13" fill="#12242b" opacity=".55" font-family="Nunito Sans,sans-serif">rede</text>
    <g stroke="#fff" stroke-width="2" fill="#fff">
      <line x1="${X0}" y1="${Y0 - 26}" x2="${X0 + w}" y2="${Y0 - 26}"/>
      <line x1="${X0}" y1="${Y0 - 32}" x2="${X0}" y2="${Y0 - 20}"/>
      <line x1="${X0 + w}" y1="${Y0 - 32}" x2="${X0 + w}" y2="${Y0 - 20}"/>
      <line x1="${X0 - 26}" y1="${Y0}" x2="${X0 - 26}" y2="${Y0 + h}"/>
      <line x1="${X0 - 32}" y1="${Y0}" x2="${X0 - 20}" y2="${Y0}"/>
      <line x1="${X0 - 32}" y1="${Y0 + h}" x2="${X0 - 20}" y2="${Y0 + h}"/>
      <text x="${X0 + w / 2}" y="${Y0 - 34}" text-anchor="middle" stroke="none" font-size="16" font-weight="700" font-family="Baloo 2,sans-serif">${formatMeters(len)} m</text>
      <text transform="translate(${X0 - 34} ${Y0 + h / 2}) rotate(-90)" text-anchor="middle" stroke="none" font-size="16" font-weight="700" font-family="Baloo 2,sans-serif">${formatMeters(wid)} m</text>
    </g>
    ${editable ? `<circle id="court-handle" cx="${X0 + w}" cy="${Y0 + h}" r="11" fill="#d9711f" stroke="#fff" stroke-width="3" style="cursor:nwse-resize"/>` : ''}
  </svg>`;
}
