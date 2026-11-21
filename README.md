# LOOPS MARKS PRO — V4

**Versão V4** (após V3.2). Atualização do motor musical e da Central Administrativa. A aplicação preserva os recursos de login Netlify Identity, armazenamento Netlify Blobs, salvamento automático, biblioteca offline, sincronização, backup e restauração, sem mudar os nomes das lojas `loops-v3-*` no Netlify. Não altera automaticamente nem apaga músicas da V3.2.

## O que muda na V4

1. **Entrada com crash + loop contínuo.** Cada seção (A, B, C, Pré-refrão, Refrão, Parte baixa/alta) pode receber um WAV opcional **Entrada com crash** de uma ou mais barras, tocado UMA vez, seguido do respectivo WAV **Contínuo** em repetição. Se não cadastrar entrada, funciona como na V3.2, usando apenas o contínuo. Para não repetir o prato, o WAV contínuo precisa ter sido exportado *sem* aquele crash inicial: não há remoção automática de instrumentos de um arquivo misturado.
2. **Viradas adaptativas.** No modo **INTELIGENTE**, ao pedir uma parte durante o compasso, o aplicativo procura uma virada previamente gravada com a duração exata que cabe antes do próximo tempo 1. Se só existir uma virada curta, usa a curta no fim do compasso; se só existir uma longa, pode começar a reproduzi-la pelo trecho final apropriado. Os WAVs são preparados antes do início do show. Uma virada pode precisar começar no **próximo tempo inteiro** se o botão for acionado no meio do tempo ou muito perto da fronteira. Se não houver espaço, a entrada no tempo 1 tem prioridade e o fill pode ser omitido.
3. **Variações opcionais.** Abra **Variações de virada** e importe WAVs com 1, 2, 3 ou até a quantidade de tempos do compasso, associando-os à virada automática/manual/específica. Por exemplo, `Virada_Para_Refrão_2T.wav` será sugerida para a variação de 2 tempos. A variação exata é preferida sobre o corte automático da virada longa. A Central permite confirmar o mapeamento da importação em lote.
4. **Virada manual tem prioridade.** Toque em Virada Leve/Forte/Especial e, antes de ela começar, escolha a próxima parte para usar essa virada, em vez da automática. Se não escolher, a virada retorna à parte atual.
5. **Repetição da mesma parte.** Tocar em Refrão quando o refrão já toca cria nova entrada no tempo musical, com a entrada com crash, se cadastrada. Em **Com virada + crash**, usa a virada; em **Direto**, começa a entrada com crash sem fill. Escolha por música na Central.
6. **Dois modos de transição.** **Inteligente** tenta entrar no próximo tempo 1 aproveitando o preenchimento que cabe. **Completa (PRÓXIMO 1)** usa a virada integral antes da entrada, mesmo que seja preciso esperar mais tempo. Pode alternar no Modo Live quando não houver troca agendada.
7. **V4 visível** no login, no topo do celular e junto à conta no desktop.

## Fluxo sugerido de gravação

- Para o Refrão, grave `Refrão_Entrada.wav` (1 compasso com ataque de prato) e `Refrão_Continuo.wav` (1–2 compassos sem ataque de prato, que se repetem perfeitamente).
- Grave `Virada_Para_Refrão.wav` (4 tempos); se quiser controle mais musical, grave também `Virada_Para_Refrão_2T.wav` etc., mas isso **não é obrigatório**.
- Todos os arquivos devem ser WAVs do **mesmo BPM**, mesmo compasso e início alinhado à grade, com durações exatas por tempo/compasso. Preste atenção à cauda do crash e possíveis cliques no ponto de loop.
- O BPM pode ser ajustado **antes da reprodução** conforme o limite do aplicativo. A faixa inteira é preparada antes do botão Iniciar ficar ativo.

## Publicar no Netlify (GitHub)

1. Extraia o ZIP. Envie **todo o conteúdo extraído** para a raiz do **mesmo** repositório GitHub conectado ao Netlify, substituindo os arquivos existentes da V3.2. Não envie o ZIP como se fosse um único arquivo.
2. No Netlify deixe **Base directory vazio**, **Package directory vazio**, **Build command: `npm run build`**, **Publish directory: `dist`**, **Functions directory: `netlify/functions`**. Mantenha Node 22 e Netlify Identity ativado. O deploy pelo GitHub executa `npm install` e o comando build, que gerará `dist/netlify-client.js` e atualizará o Service Worker.
3. Espere o deploy ficar publicado e confirme o rótulo **V4** no domínio principal de produção (`loops-marks-pro.netlify.app`, se ainda for seu domínio). Não use Permalink de uma versão antiga.
4. Faça **Backup completo** antes de cadastrar os WAVs definitivos. No celular, sincronize e toque em **Baixar/Atualizar offline**, depois teste em modo avião no mesmo aparelho que será usado ao vivo.

## Limitações e segurança

- **O ZIP não foi publicado automaticamente.** Os testes JavaScript executados no ambiente local não são equivalentes a um ensaio com áudio real no Netlify/iPhone. **Teste as viradas e o funcionamento offline antes da cerimônia**.
- Para evitar nova reprodução do prato nas repetições, deve existir um WAV contínuo sem prato; não é possível remover o crash embutido numa mistura pronta de forma confiável apenas pela lógica de loop.
- Viradas começando no meio de uma frase podem soar musicalmente inadequadas mesmo quando o tempo está correto. Ouça a transição com suas gravações e cadastre uma variante curta quando necessário.
- No iPhone, IndexedDB/Service Worker são armazenamento do aplicativo e podem ser limpos pelo sistema; mantenha backup externo. O salvamento na nuvem depende de internet, e o modo offline deve ser baixado e verificado previamente.
- O backup ZIP completo existente tem limite de **420 MB por pacote**; se ultrapassar, organize os áudios e exporte por etapas.
- Em Netlify, verifique cotas e limites do seu plano para armazenamento e Functions.

## Testes

`npm test`: cenários V3.2 (login, API Netlify, motor anterior) e testes V4 para entrada com crash, loop contínuo, variações gravadas, corte de virada longa, prioridade manual, repetição de parte, modos de execução e encerramentos.

`npm run build`: build da integração Netlify Identity/fflate/esbuild. Requer acesso às dependências npm. O ambiente de montagem não pôde concluir a instalação externa dessas dependências; portanto, a compilação completa deverá ser confirmada no deploy Netlify.
