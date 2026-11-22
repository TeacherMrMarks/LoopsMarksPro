// Correspondência local, sem serviço externo: o usuário confirma a sugestão antes da importação.
const norm = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\.wav$/i, '').replace(/[^a-z0-9]+/g, '_')
  .replace(/^\d+_*/, '').replace(/_+/g, '_').replace(/^_|_$/g, '');

export function suggestSlot(filename) {
  const text = norm(filename);
  // Distingue o crash de parada (bumbo + prato) da entrada de loop com crash.
  // Ex.: Crash_Final_2.wav -> crashStop2; Parte_A_com_crash.wav -> aEntry.
  if (/(?:^|_)(?:crash|prato)(?:_|$)/.test(text) &&
      /(?:final|parada|stop|encerramento|bumbo)/.test(text)) {
    const n = text.match(/(?:^|_)([123])(?:_|$)/)?.[1];
    return n && n !== '1' ? 'crashStop' + n : 'crashStop';
  }
  // Ex.: Virada_Refrão_2T.wav -> fillChorus__2; Refrão_Entrada.wav -> chorusEntry.
  const duration = text.match(/(?:_|^)([1-9]\d?)(?:t|tempo|tempos)(?:_|$)/)?.[1];
  const entry = /(entrada|com_crash|crash|ataque|primeiro_loop|loop_1)(?:_|$)/.test(text);
  const base = text.replace(/(?:_|^)[1-9]\d?(?:t|tempo|tempos)(?:_|$)/g, '_')
    .replace(/(?:_|^)(entrada|com_crash|crash|ataque|primeiro_loop|loop_1)(?:_|$)/g, '_');
  const role = roleSlot(base);
  if (entry && ['a','b','c','d','e','pre','chorus','low','high'].includes(role)) return role + 'Entry';
  if (duration && role?.startsWith('fill')) return role + '__' + Number(duration);
  return role;
}
function roleSlot(text) {
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
    const match = text.match(/(?:^|_)(?:parte_?)?([abcde])(?:$|_)/);
    return match ? {a:'fillA',b:'fillB',c:'fillC',d:'fillD',e:'fillE'}[match[1]] : '';
  }
  if (/(contagem|count_?in|count_?off|baquetas?|click_?intro|intro_?1|introducao_?1)/.test(text)) return 'countIntro';
  if (/(intro|introducao)/.test(text)) return 'intro';
  if (/(pre_refrao|pre_chorus)/.test(text)) return 'pre';
  if (/(refrao|chorus)/.test(text)) return 'chorus';
  if (/(parte_baixa|low|baixa)/.test(text)) return 'low';
  if (/(parte_alta|high|alta)/.test(text)) return 'high';
  const match = text.match(/(?:^|_)(?:loop_?)?(?:parte_?)?([abcde])(?:$|_)/);
  return match ? match[1] : '';
}
