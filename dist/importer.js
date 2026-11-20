// Correspondência local, sem serviço externo: o usuário confirma a sugestão antes da importação.
const norm = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\.wav$/i, '').replace(/[^a-z0-9]+/g, '_')
  .replace(/^\d+_*/, '').replace(/_+/g, '_').replace(/^_|_$/g, '');

export function suggestSlot(filename) {
  const text = norm(filename);
  if (/(acabamento|fechamento|ending_curto|final_curto|saida_curta)/.test(text)) return 'finish';
  if (/(final|outro|encerramento|saida_final)/.test(text)) return 'outro';
  const fill = /(virada|fill|passagem|transicao)/.test(text);
  if (fill) {
    if (/(leve|simples|light|soft)/.test(text)) return 'fillLight';
    if (/(forte|strong|power|pesada)/.test(text)) return 'fillStrong';
    if (/(especial|extra|special)/.test(text)) return 'fillSpecial';
    if (/(intro|introducao)/.test(text)) return 'fillIntro';
    if (/(pre_refrao|pre_chorus)/.test(text)) return 'fillPre';
    if (/(refrao|chorus)/.test(text)) return 'fillChorus';
    if (/(parte_baixa|low|baixa)/.test(text)) return 'fillLow';
    if (/(parte_alta|high|alta)/.test(text)) return 'fillHigh';
    const match = text.match(/(?:parte_?)?([abc])(?:$|_)/);
    return match ? {a:'fillA',b:'fillB',c:'fillC'}[match[1]] : '';
  }
  if (/(intro|introducao)/.test(text)) return 'intro';
  if (/(pre_refrao|pre_chorus)/.test(text)) return 'pre';
  if (/(refrao|chorus)/.test(text)) return 'chorus';
  if (/(parte_baixa|low|baixa)/.test(text)) return 'low';
  if (/(parte_alta|high|alta)/.test(text)) return 'high';
  const match = text.match(/(?:^|_)(?:loop_?)?(?:parte_?)?([abc])(?:$|_)/);
  return match ? match[1] : '';
}
