# Loops Marks Pro — V13

**Pacote de atualização do mesmo projeto GitHub + Netlify**, criado a partir da V12, sem apagar nem renomear os stores existentes de músicas e WAVs. A V12 permanece preservada como arquivo ZIP separado.

## Recursos implementados

**Repertório com nome e BPM próprios por apresentação**
- Adicione uma música cadastrada ou um ritmo reutilizável a um repertório.
- Cada item do repertório aceita **nome próprio** (por exemplo, “Entrada da noiva”) e **BPM individual**.
- O mesmo ritmo pode ser utilizado várias vezes com nomes e andamentos distintos, sem alterar o cadastro original nem duplicar os WAVs.
- Continua valendo o limite anterior de **±10 BPM** para preservar a qualidade dos áudios. Os ritmos e músicas podem ser reordenados, duplicados e excluídos do repertório.
- No modo ao vivo, selecionar uma música ou um repertório fecha a gaveta e retorna aos botões do player.

**Mapa da sequência musical (para músicas)**
- Seção nova no editor: crie uma ordem com partes musicais já cadastradas, introdução inicial e encerramentos.
- Acrescente quantas etapas precisar (limite técnico: 120), incluindo retornos e repetições. Cada etapa aceita de 1 a 16 repetições ou **Até comando**.
- **Modo assistido:** o botão “Próxima parte” avança a música quando você decidir. Há também “Etapa anterior”. As viradas e entradas continuam respeitando o relógio de áudio.
- **Modo automático:** a passagem é agendada usando a duração do WAV, o BPM e os compassos; é possível interromper a sequência ao acionar manualmente outra parte. Etapas “Até comando” aguardam seu comando.
- A introdução gravada toca automaticamente antes do primeiro loop. Quando usada no mapa, permanece como etapa de abertura (não como retorno de meio de música).
- Os ritmos genéricos continuam com troca livre pelos botões ou pelo pedal, sem obrigação de usar mapa.

**Partes musicais adicionais**
- Novo editor “Mais partes musicais”: crie, renomeie e remova seções personalizadas (até 36), como Ponte, Solo, Verso 3, Interlúdio, Parte D/E, Coda ou qualquer outro nome.
- Para cada parte, importe um loop WAV contínuo e, opcionalmente, uma primeira entrada com crash.
- Essas partes entram nos mapas de transição e de sequência e aparecem como botões no Modo Live quando tiverem WAV.

**Backup e janelas**
- O backup completo exporta os novos nomes do repertório, BPMs, mapas, partes personalizadas e WAVs, além das pastas e preferências locais não sensíveis (como o mapeamento do pedal).
- A **importação do ZIP** recria os registros e os arquivos sem apagar os existentes. Os links de acesso e credenciais não entram no backup por segurança.
- A janela de Backup/Restauração ganhou layout responsivo, importação em destaque, opções avançadas recolhíveis e botão **X** de fechamento. A janela de link do músico também possui X.
- Os diálogos de Configurações passam a impedir rolagem **horizontal**. Em telas muito pequenas, ainda pode haver rolagem vertical para evitar ocultar funções.

## Publicação no Netlify

1. Faça **Backup completo** da V12 antes de qualquer atualização e guarde o ZIP original.
2. Extraia o ZIP V13 e envie o **conteúdo extraído** à raiz do mesmo repositório GitHub `LoopsMarksPro`.
3. Configuração de build: base vazia; `npm run build`; publish `dist`; functions `netlify/functions`.
4. Mantenha o bloqueio de publicação automática se desejar testar o novo **Permalink** antes de promover a V13 ao endereço principal.
5. Confirme que aparece `V13`, entre com seu Netlify Identity e teste com a música já cadastrada, um repertório com duas músicas usando o mesmo ritmo em BPMs diferentes e uma sequência musical de teste.
6. Antes de cerimônias, faça teste real de áudio e Modo Avião no iPhone 11, inclusive mudanças automáticas, acabamentos e baixa/atualização de WAVs.

## Compatibilidade / segurança

- Mantidos os stores `loops-v3-songs`, `loops-v3-wavs`, `loops-v3-history`, `loops-v11-library` e `loops-v12-access`, sem migração destrutiva.
- Mantidos o Netlify Identity, links revogáveis de músico, armazenamento Netlify Blobs, motor de viradas adaptativas, entradas com crash, controle por pedal Bluetooth HID, backup, PWA e reprodução offline.
- **O teste local não substitui testes no Netlify e com seus WAVs reais.** Os fluxos automáticos seguem sendo aperfeiçoados e devem ser ensaiados antes de apresentações.

## Validação local

- 62 testes automatizados passando: regressões desde as versões anteriores, metadados de repertório, novas partes, componentes da interface e agendamento de etapa automática pelo relógio de áudio simulado.
- Sintaxe JavaScript conferida.
- **Build completo não executado neste ambiente** porque as dependências npm (`esbuild`, `@netlify/identity`, `@netlify/blobs`, `fflate`) não estavam instaladas. A compilação precisa ser confirmada no Netlify.
- O navegador automatizado deste ambiente bloqueou a abertura da prévia local, então o layout da V13 ainda precisa de validação visual no Permalink.
