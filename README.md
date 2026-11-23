# Loops Marks Pro — V36

Base: V35 preservada (motor Web Audio V34, serviços Netlify, armazenamento, WAVs, MIDI, pedal, mixer e backup).

## Novidades V36 — Palco compacto e identidade azul/índigo

- **Nova identidade visual:** fundo azul-noturno/índigo, botões azuis, violetas, âmbar e vinho, sem a paleta verde anterior. Ícone e PWA atualizados; funções permanecem iguais.
- **Partes com cores próprias:** cada parte recebe um tom por ordem de exibição, com destaque magenta fixo para o Refrão, sem mudar os IDs musicais.
- **Cabeçalho visível no iPhone:** seis atalhos com rótulos (Pedal, MIDI, Áudio, Mixer, Tela cheia, Repertório), sempre no topo do palco. Área segura iOS considerada.
- **Palco em uma tela:** o documento não rola no celular. O player ocupa a faixa superior, e os botões aparecem em matriz responsiva de até 6 colunas. Altura mínima de 48 px. Para mais itens do que cabe com toque seguro, a rolagem acontece somente dentro do painel de botões, mantendo os atalhos e o transport sempre visíveis.
- **Tela horizontal:** 6 colunas quando a largura comporta; menor altura pode exigir rolagem interna do painel, nunca reduzir o botão abaixo de 48 px.
- **Preservação:** `audio.js`, `audio-output.js`, `data.js`, `backup.js`, `preferences.js`, `midi.js`, `mixer.js` e funções Netlify estão byte a byte iguais aos do ZIP V35. Layout adaptativo isolado em `dist/stage-fit.js`; estilo V36 em `dist/v36-ui.css`.
- **Testes:** 233/233 testes automatizados Node aprovados; renderização visual com Chromium em 320, 375, 393, 414 e 844 px. Sem validação em iPhone físico ou no Netlify antes de publicar.

## Histórico V35

Base: V34. Preservação dos identificadores WAV, dados, mapeamentos MIDI/pedal e chaves anteriores de armazenamento.

## Novidades V35 — Palco mobile

- Cabeçalho do Palco em duas linhas até 900 px, com seis atalhos disponíveis: pedal, MIDI, áudio, mixer, tela cheia e repertório. Área segura do iOS respeitada; cabeçalho permanece acessível durante a rolagem. O acesso administrativo continua restrito conforme a V34.
- A contagem mantém o título principal, sem repetir a descrição lateral; uma próxima parte agendada continua visível. As descrições laterais longas passam a quebrar linha.
- Painel do mixer adaptado à altura do cabeçalho mobile. Motor, saída de áudio iOS, dados, sincronização, backup e permissões preservados.
- Validação: 228/228 testes Node. Verificação de layout em Chromium com HTML de teste (320, 375, 393, 844 e 1280 px, com/sem acesso administrativo), incluindo cabeçalho durante rolagem e painel do mixer. A navegação do aplicativo completo foi bloqueada pelo ambiente. Build local não executado por falta de esbuild; Safari/iPhone e Netlify ainda precisam ser validados.

## Novidades V34 — Recuperação de áudio no iPhone

- A inicialização do player no iOS volta ao caminho direto do toque em Iniciar, sem aguardar o roteamento de saída da V33. O iPhone/iPad utiliza a saída do sistema; a seleção de saída continua disponível em computadores compatíveis. O contexto iOS usa as opções padrão do navegador e solicita AudioSession playback quando disponível. Um buffer silencioso de uma amostra é agendado como tentativa de desbloqueio, sem modificar os WAVs.
- O ícone de fones oferece dois diagnósticos independentes: Testar motor Web Audio e Testar áudio nativo (WAV curto reproduzido pelo elemento HTML audio). O segundo não usa o mixer nem o motor musical. O WAV é incluído no cache offline com tratamento de solicitações de faixa de bytes. Ouvir o teste nativo não garante que Web Audio esteja funcionando.
- MIDI: a solicitação do dispositivo é iniciada diretamente no clique, antes da inicialização do áudio; preserva as opções de reconexão, compatibilidade, diagnóstico e mapeamentos. Reconhecimento físico ainda depende do navegador e hardware.
- Nenhuma mudança no agendamento de viradas, loops, caudas, pratos, mixagem ou estrutura de dados/backups. Restrições de acesso da V33 preservadas. 225 testes locais aprovados, incluindo 5 novos. Build de produção pendente por ausência de esbuild; testes físicos no iPhone e controlador ainda necessários. Não se afirma que a regressão foi reproduzida ou definitivamente resolvida em hardware.

## Novidades V33 — acesso, saída de áudio e MIDI

- Celulares e tablets detectados abrem exclusivamente o Modo Palco, inclusive quando o administrador entra pelo endereço da Central. A interface administrativa continua disponível no desktop/Chromebook. A detecção de dispositivo é uma restrição de interface, não uma substituição da autorização do servidor.
- Links com `modo=musico` ou `chave` não promovem a sessão para administração. Uma chave inválida explícita não usa uma chave antiga silenciosamente. O endpoint de músico permanece somente de leitura. O manifesto geral abre o palco com login normal; o manifesto individual mantém o token e acesso limitado.
- Ícone de fones na Central e no Palco: escolha de saída quando suportada (padrão do sistema como fallback), pesquisa, autorização quando disponível, teste de tom independente do mixer, diagnóstico de estado e alertas de Master/Loops silenciados por volume, mute ou solo. Reconectar áudio retoma a sessão e reaplica a rota; Reiniciar motor recria o contexto somente quando parado. Preferência de saída local ao aparelho, não modifica mixagem nem backups existentes.
- MIDI: busca com nova solicitação quando não há entradas, conexão compatível sem opções extras, listas de entradas de pontes antigas, recuperação de handlers e proteção contra reconexões automáticas concorrentes. Atribuições e sync da V29 mantidos. Se o sistema/navegador não expõe o dispositivo MIDI, o aplicativo não consegue inventar a entrada.
- Validação: 220 testes locais aprovados (208 anteriores, 12 novos); testes de acesso com HTML simulado, MIDI/áudio com dispositivos simulados. Build Netlify pendente: `esbuild` não instalado neste ambiente. Teste com controlador real e alto-falantes ainda necessário.

## Novidades V32 — Acabamento com crash automático final

- Central > Finais > Acabamento: use um WAV de virada de um compasso, podendo incluir o bumbo no primeiro tempo seguinte. O arquivo toca integralmente. O crash automático é agendado nesse primeiro tempo seguinte, utilizando o prato da parte de origem e o volume de crash automático, pelo canal Pratos.
- O ataque só é acrescentado se o crash automático estiver ligado, houver WAV preparado e o acabamento não indicar prato de ataque próprio. O seletor de identificação permite corrigir manualmente a inferência pelo nome do WAV. Não é necessário reimportar o áudio.
- Condução e chimbais elegíveis permanecem até a queda final, respeitando a identificação do WAV. O player não inicia outro loop e mantém a reprodução até a cauda do prato final terminar; STOP encerra todas as fontes imediatamente. Cancelar um acabamento ainda não iniciado cancela o prato agendado.
- O Final personalizado continua sendo um WAV único, sem crash automático adicional. Os atalhos existentes de Acabamento e Final permanecem iguais.
- 208 testes locais aprovados: 200 anteriores e 8 novos, por simulação do motor de áudio e verificações de código. Build de produção e testes reais no Netlify/navegador ainda pendentes.


## Novidades V31 — Recuperação MIDI

- Central e Palco: Conectar, Reconectar (nova solicitação de acesso), Buscar dispositivos, diagnóstico de permissão/HTTPS/política do navegador, estado das portas e monitor de sinais. A conexão explicita a abertura das entradas e recupera dispositivos reconectados. Sem exigir SysEx.
- A reconexão não apaga atribuições nem altera os WAVs, pedal, motor de áudio, backup ou sincronização da V30. Permissões do navegador continuam dependentes do endereço e hardware. Diagnóstico não pode listar interfaces que o sistema não expõe como MIDI.
- Teste no Chrome com o controlador real, aguarde a permissão, confira as entradas e pressione um pad. Se não houver entrada, confira cabo de dados e reconhecimento pelo sistema. iPhone depende de ponte compatível.

## Validação V31

- 200 testes locais aprovados (192 anteriores e oito novos). Verificação de sintaxe concluída. Build de produção bloqueado por dependência esbuild ausente; teste com controlador físico e deploy Netlify ainda pendentes.

## Novidades V30 — Cauda sonora inteligente nas passagens

- Central > Passagens: cada passagem tem a opção **Preservar cauda sonora** e, quando ligada, **Retorno da bateria após (compassos)**, de 1 a 64. Pode ligar para WAVs já existentes sem reimportação. Para WAVs de duração livre, ligue antes de importar. O arquivo original e sua duração não são modificados pelo campo de retorno.
- Exemplo: carrilhão + bumbo de 3 compassos (ou duração livre), retorno após 1. A passagem toca uma única vez desde o tempo 1, a parte selecionada volta na cabeça do compasso seguinte e o carrilhão continua até o final do WAV, sem reinício ou corte pelo retorno. Se o arquivo tiver ataques extras na cauda, eles também continuam soando. A passagem não substitui o loop depois do retorno e o crash automático segue as regras anteriores.
- Caudas continuam durante novas viradas e trocas de parte; STOP encerra todas as fontes. Cancelar uma passagem agendada antes de começar também cancela seu áudio. O volume permanece no canal Passagens; crashes conservam suas próprias caudas no canal Pratos. O retorno respeita o BPM, fórmula de compasso e comandos existentes de tela, pedal e MIDI.
- A opção começa desligada nos cadastros antigos, mantendo o comportamento V29 com WAVs de compassos completos. Para desligá-la depois de importar um WAV de duração livre, substitua por um WAV compatível de compassos completos ou remova o arquivo primeiro. O limite de tamanho de WAV permanece 32 MB.
- Configurações por passagem salvas no mesmo catálogo local, na nuvem e no backup completo, com validação no servidor. Atualize todos os dispositivos antes de editar. Não mude os stores ou as chaves de preferências da V29.

## Validação V30

- 192 testes automatizados locais aprovados (183 anteriores e 9 novos), com relógio Web Audio, fontes, ajuste de BPM, API e backup simulados. Testes de sintaxe e integridade do ZIP concluídos. Os testes não certificam reprodução acústica, dispositivos reais, rede real nem o codec ZIP de produção.
- Build local bloqueado por ausência de esbuild. O Netlify deve executar npm run build; valide no Permalink antes de publicar. Não publique dist isoladamente.

## Novidades V29 — Persistência de controles e Palco compacto

- Conta administrativa: MIDI, pedal e contagens individuais por música/ritmo/item de repertório têm armazenamento local e sincronização em um novo store privado Netlify Blobs, sem modificar os stores de músicas, WAVs, repertórios ou usuários. A autorização de hardware MIDI continua por navegador; links de músico continuam somente leitura e suas preferências de execução são locais.
- A migração lê preferências existentes no endereço atual. Um novo endereço vazio não envia padrões vazios para a nuvem. Alterações intencionais são registradas em uma fila local por conta; revisões por campo e escrita condicional por ETag evitam substituir dados remotos divergentes. Em conflito, Configurações > Resolver sincronização permite escolher a cópia local ou remota. Aguarde Sincronizado, que considera também cadastros/repertórios sujos ou conflitantes. Sincronização quando o player está parado.
- Configurações > Backup e restauração > Restaurar somente MIDI e pedal: lê o manifesto de um backup V3/V4 sem duplicar cadastros, áudios ou repertórios. Caso o mapeamento esteja no antigo Permalink V27, exporte Configurações por aquele endereço e importe somente os controles pela V29. Um backup da V28 que já não contenha os mapeamentos não os recupera.
- Palco: grade compacta de até quatro colunas para condução, chimbais, contratempos e passagens, com estados e filtros de WAV preservados. Crash automático na entrada solicitada da parte, com ou sem virada, inclusive após passagem/contratempo, sem repetir a cada compasso nem duplicar prato embutido. Abertura automática sem introdução mantém a regra anterior; início por parte explicitamente escolhida recebe ataque quando habilitado.
- Para a validação real, teste em dois Permalinks do mesmo site/conta, após sincronização, e confira WAVs e mapeamentos. Não edite simultaneamente por versões antigas; elas não sincronizam os controles.

## Novidades V28 — Orquestração de pratos e resposta imediata

- Central > Crash > Prato de condução manual e chimbais: três WAVs independentes, em compassos completos, cada um com volume de 0 a 100%. Chimbal aberto e condução ficam armados para o refrão; chimbal fechado para A, B, C, D, E, pré-refrão, parte baixa e partes adicionais. Parte alta não dispara essas camadas por padrão. O canal Pratos do mixer controla todas as camadas e crashes juntos.
- No Palco, cada botão aparece só com WAV válido e preparado. Pode ligar/desligar antes ou durante a execução; estado armado não significa que está soando. A orquestração da parte de origem continua na virada e muda na queda do tempo 1; contratempos, passagens e finais suspendem as camadas. Nomes de WAV e correções manuais evitam dobrar condução/chimbal. Estado de execução é temporário, enquanto arquivos, volumes, identificação e atribuições são salvos e exportados.
- Virada inteligente: agendamento com antecedência de cerca de 6 ms no relógio Web Audio, sem aguardar o próximo pulso quando há WAV suficiente; recorte fracionário da cauda para encaixar atrasos, preservando o ataque quando o comando coincide com o início. Se só houver uma virada curta e ainda faltar mais tempo que a duração dela, ela começa no ponto musical compatível, para não abrir lacuna. Modo completo e mapa automático preservados. A latência física depende do aparelho.
- O Palco oculta as viradas automáticas de A/B/C/D/E, pré-refrão e refrão; ficam no cadastro e nos botões das partes. Viradas leves, fortes, especiais, específicas, introdução, baixa/alta, contratempos, passagens e finais mantêm seus controles. Atribuições antigas de viradas ocultas continuam reconhecidas por MIDI/pedal; novos comandos de chimbal podem ser aprendidos. Repertórios e personalizações independentes da V27 preservados.
- Backup completo, sincronização e API incluem os novos WAVs, volumes, identificações e mapeamentos. Cadastros antigos sem chimbais continuam válidos e seus volumes novos assumem 100%.

## Novidades V27 — Repertórios independentes

- Na Central > Repertórios, clique na engrenagem ao lado de cada item para personalizar os nomes das partes (inclusive partes personalizadas com WAV) e os oito canais do mixer, MUTE e SOLO. Campos de nome vazios herdam o original; desmarcar Usar mixagem própria herda a mixagem original. Herdar original limpa personalizações de nomes e mixer, sem mudar título/BPM do item.
- Cada ocorrência recebe um identificador estável, inclusive ao repetir o mesmo ritmo no mesmo repertório. V26 e anteriores são migrados sem perder título/BPM. Duplicar repertório cria identificadores novos. Os WAVs e IDs das partes, viradas, mapas e comandos continuam compartilhados por referência; ajustes do repertório não gravam no cadastro original. O item sem personalização acompanha as alterações intencionais na origem.
- No Palco, a mixagem administrativa é salva automaticamente no item do repertório, sincronizada quando parado. Link do músico mantém ajustes de mixagem locais por item, sem editar a biblioteca. A preferência local de contagem também é separada por item. O BPM de origem não muda; continua valendo a faixa de ±10 BPM. Selecionar a música diretamente na biblioteca sai do contexto do repertório.
- Exportação/restauração inclui identificadores, rótulos, mixagem e preferências locais por ocorrência, remapeando as referências na importação. O backup continua no esquema 4 e aceita backups anteriores. Restauração cria novas cópias. Atualize todos os aparelhos para V27 antes de editar repertórios: clientes antigos não entendem os novos campos.
- O repositório impede salvar uma projeção de palco sobre um cadastro de origem. O limite de tamanho dos metadados na API foi ampliado para acomodar os perfis independentes (1,8 milhão de caracteres; limite de requisição 2 MB).

## Recursos preservados da V26

- Mixer: nomes dos oito canais em branco de alto contraste, maior peso e tamanho, incluindo no celular; botões MUTE e SOLO nos sete canais de fonte (Master continua com MUTE e volume geral). Múltiplos solos permitidos; MUTE explícito tem prioridade. Limpar SOLO restaura a escuta normal sem alterar os faders ou o MUTE. O fader Pratos continua único.
- SOLO atua sobre os ganhos existentes, preservando agendamento, fontes e tempo musical. Estados do mixer persistem por música/ritmo; no acesso músico, são locais ao aparelho, como na V25. Verifique se nenhum SOLO está ativo antes do show.
- Partes D e E opcionais com seus próprios loops, entradas com crash, viradas, importação inteligente de nomes e comandos MIDI/pedal. Só aparecem no palco quando houver WAV. A área Mais partes musicais permite adicionar partes F e seguintes, com o limite de segurança anterior de 36 partes personalizadas e 250 referências de áudio no total.
- Renomeie a introdução musical e as partes contínuas na Central, aba Loops, com dois cliques/dois toques no nome ou pelo lápis. A caixa de edição permite retornar ao nome padrão. Partes personalizadas guardam o nome original para restauração. Os identificadores internos continuam estáveis; WAV, entrada, virada, mapa, pratos e comandos não são alterados. As etiquetas atualizadas aparecem também nos botões do Palco e nos seletores associados. Novos cadastros independentes começam com nomes padrão; uma música criada pela função de cópia de ritmo pode herdar os nomes do modelo, mas suas alterações são independentes.
- Nomes e SOLO integram o salvamento, catálogo em nuvem e backup. Backups anteriores sem esses campos continuam compatíveis, com os nomes e mixagem padrão anteriores.

## Recursos V25 preservados

- Modo Palco Pro substitui o nome e a apresentação do antigo Modo Live, mantendo os links `modo=musico` e `modo=ao-vivo`. Botões adaptáveis, fase atual, próxima parte, pulsos, forma de onda, repertório e tela cheia (ou foco de palco quando a API não estiver disponível). Partes e viradas cadastradas, inclusive personalizadas, são exibidas conforme os WAVs; introdução possui comando para iniciar pela abertura, e as entradas com crash continuam ligadas à parte correspondente.
- Mixer Marks Pro: ícone compacto ao lado do pedal e MIDI na Central e no Palco. Painel não modal, faders verticais, mute, restauração dos padrões. Oito canais: Master, Loops, Viradas, Pratos, Contratempos, Passagens, Contagem e Finais. Pratos agrupa crashes automáticos, manuais e condução; os volumes-base específicos da V24 continuam preservados. Pratos que estão gravados dentro de WAVs de bateria não podem ser separados por esse fader.
- Ganhos independentes via Web Audio, com suavização de 12 ms (constante de tempo); não reiniciam fontes nem alteram o agendamento musical. Prévia dos WAVs na Central utiliza a mixagem do cadastro. Os faders podem ser atribuídos a mensagens MIDI CC. O pedal HID permanece funcional.
- Mixagem administrativa por música/ritmo com gravação automática local e sincronização quando a execução para. No acesso individual de músico, ajustes do mixer são preferências locais, sem editar a biblioteca administrativa. Perfis e preferências locais entram na exportação/restauração do backup, junto com os mapeamentos MIDI e pedal. Cache offline inclui mixer.js.

## Recursos preservados da V24
- Crash automático: três WAVs de ataque independentes, acionados no tempo 1 da parte de destino após uma virada efetivamente agendada. Distribuição A/B/Refrão, demais partes existentes em rodízio; se faltarem pratos, usa os disponíveis. Com entrada Loop + Crash cadastrada ou WAV com prato/crash identificado, o ataque automático é suprimido. A expressão `sem prato` ou `sem crash` indica ausência; a identificação pode ser corrigida manualmente no cadastro. Volume independente e botão de ligar/desligar no Live. O botão Live é temporário; o padrão é configurado na área administrativa e sincronizado. Crashes manuais da V23 continuam separados.
- Condução manual: WAV em compassos completos, ligado/desligado no próximo tempo 1. A condução para no início efetivo de viradas e trechos especiais; retoma no tempo 1 da parte seguinte quando ativada. Loops com condução já gravada (nome ou correção manual) suspendem a camada. Stop encerra todos os sons. Volume independente.
- Contratempos e Passagens: duas abas antes de Finais. Adicionar, nomear, importar WAV, reutilizar, ouvir e excluir trechos. Duração inferida do WAV, de 1, 2 ou mais compassos inteiros, ajustável no cadastro. No Live entram no próximo tempo 1, executam uma vez e retornam à parte anterior ou à parte escolhida. A condução é suspensa durante o trecho. Apenas arquivos vinculados e preparados são exibidos. O limite de segurança preexistente do catálogo é de 250 referências de WAV por música/ritmo, com arquivos de até 32 MB cada; não há um número fixo de botões de contratempos ou passagens.
- Pedal HID e MIDI Learn: comandos de ligar/desligar crash automático, condução, contratempos e passagens numerados. O seletor exibe os trechos existentes no catálogo; o número identifica o slot na música/ritmo atual. Adicione novas atribuições HID conforme necessário (seis campos iniciais). Mapeamentos MIDI anteriores mantidos.
- Backup: completo inclui WAVs novos e antigos, nomes, duração, metadados de detecção, volumes, estado padrão de crash automático, repertórios, pastas, associações HID/MIDI e preferências locais de contagem remapeadas na restauração. Modo configurações não contém WAVs. Backups anteriores continuam aceitos. A restauração cria cópias conforme o mecanismo existente; valide em ambiente de teste. Os estados temporários do palco (condução tocando, fila de ações) não são restaurados como reprodução ativa.
- Sincronização: novos dados enviados pelo catálogo da mesma conta Netlify; dispositivo músico recebe as configurações e arquivos após sincronizar/baixar. Preferências de controle por dispositivo continuam locais e transferíveis por backup.

## MIDI Learn Pro

- Ícone de teclado ao lado do pedal no Modo Palco Pro e cabeçalho da Central; também em Configurações da Central.
- Conectar MIDI solicita Web MIDI apenas com `sysex:false`, mostra entradas reconhecidas e monitor de mensagens. USB e Bluetooth MIDI dependem do sistema operacional, navegador e equipamento.
- Escolha uma função, clique em Aprender MIDI e pressione uma tecla/pad/botão ou mova um controle CC. Aprende Note On, CC e Program Change. Note Off e Note On com velocidade zero não disparam comandos. Não há número fixo de slots como no pedal antigo.
- Para CC: pressão (cruza valor 64), variação (valor mudou) ou pulso relativo (cada mensagem). Para knobs/faders absolutos, volume utiliza 0–127 e BPM mapeia a faixa original permitida. BPM continua ajustável apenas quando parado, conforme V21.
- Atribuições incluem Iniciar/Retomar, Iniciar/Parar, Parar, introdução musical (ao iniciar), partes, viradas manuais, crashes, acabamento, final, modo de virada, cancelamento, contagem, repertório, mapa, volume e BPM. Partes personalizadas cadastradas também são selecionáveis conforme a música/ritmo aberto.
- Selecionar, editar ou excluir atribuições sem modificar os pedais. Aprender novamente o mesmo sinal específico substitui sua associação. Pode vincular a um dispositivo ou permitir qualquer dispositivo. Dispositivo específico tem prioridade.
- Na V29, as atribuições administrativas são sincronizadas na nuvem e preservadas localmente; links de músico mantêm configurações locais. Permalinks de origens diferentes não compartilham localStorage, por isso migre com o backup quando necessário.
- Dispositivos conectados/desconectados atualizam a lista. Reconexão automática quando o navegador concede acesso já autorizado; se necessário, clique em Conectar MIDI novamente. Durante o aprendizado, não são executados comandos musicais. Feche o painel para usar o Modo Palco Pro.
- Controle MIDI e pedal HID podem funcionar na mesma sessão sem modificar os mapeamentos existentes. As ações MIDI reutilizam os controles do Modo Palco Pro e seus bloqueios. Crashes continuam dependentes de WAV e tocando sobre o loop no tempo 1.

## Compatibilidade e primeiro teste

Chrome de Chromebook/Windows/macOS e navegador Android compatível: conectar dispositivo reconhecido, abrir site HTTPS, permitir MIDI. No iPhone/iPad, Safari/PWA não disponibiliza Web MIDI nativo; pode-se testar uma ponte compatível, como Web MIDI Browser, mas não há garantia de compatibilidade com este site ou sua autenticação. A interface de áudio deve transmitir MIDI, não apenas áudio. Bluetooth MIDI depende da exposição pelo SO/navegador. Pedal HID continua disponível. O áudio pode exigir um gesto de desbloqueio: abra o painel MIDI por toque/clique ou toque Iniciar na tela antes de operar exclusivamente pelo controlador.

## Validação V28

- `npm test`: 171/171 testes aprovados (166 casos anteriores, incluindo regras antigas adaptadas ao novo comportamento, e 5 novos). Motor Web Audio testado por simulação de relógio, fontes e ganhos. O teste de backup utiliza um codec de teste substituto para validar exportação/restauração de metadados, WAVs e mapeamentos; não certifica a biblioteca ZIP real de produção.
- `node --check`: módulos JS, scripts e funções Netlify sem erros de sintaxe.
- `npm run build`: bloqueado porque o pacote `esbuild` não está instalado no ambiente. O Netlify precisa realizar o build, que substitui `dist/netlify-client.js` pelo cliente real de Identity/fflate. Não publique `dist` isoladamente.
- Testes com navegador real, WAVs reais, hardware e Netlify/Identity/Blobs ainda pendentes. Validar no Permalink antes da publicação oficial.

## Validação V29

- Testes locais: 183/183 aprovados, incluindo funções simuladas do Netlify, migração, recuperação, conflitos, restauração exclusiva dos controles (codec ZIP simulado) e ataques na entrada. Sintaxe verificada.
- Build de produção não executado: esbuild indisponível. Validação no Netlify e com hardware/WAVs reais pendente.

## V37 — identidade clara (apenas interface)

- Base: V36, preservando engine musical, áudio V34, ajustes de palco V36, MIDI, pedal, repertório, backups e funções de servidor.
- Paleta de fundo branco-azulado e painéis brancos com bordas suaves. Cabeçalho em gradiente azul; botão Iniciar verde, Stop vermelho e Refrão magenta.
- Partes musicais com cores distintas; onda de áudio roxa/azul; Central Administrativa, mixer e repertório com estilo claro coerente.
- Em telas móveis, os seis atalhos da V36 e a matriz compacta continuam iguais no funcionamento, sem alterar comandos/tamanho mínimo de toque.
- Validação no Safari/iPhone e deploy Netlify continua necessária.
