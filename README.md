# Loops Marks Pro — V20

Atualização incremental da **V19**: contagem inicial controlável no Modo Live e três WAVs de crash de ataque em sobreposição ao loop. Preserva os identificadores e caminhos dos WAVs existentes, músicas, ritmos, repertórios, pedais, autenticação, backup e sincronização.

## Novidades V20

### Contagem opcional no Modo Live (Central e celular)

- Ao lado de **Virada: INTELIGENTE**, botão **Contagem: LIGADA / DESLIGADA**.
- Seletor de **1 ou 2 compassos** da contagem. Respeita os pulsos do compasso cadastrado, inclusive 3/4, 6/8 e 12/8.
- O botão só fica disponível com WAV de contagem, e as mudanças devem ser feitas antes de iniciar ou após parar.
- Com contagem ligada: **Iniciar → Contagem → Introdução musical (se houver) → Parte inicial**. Em ensaio, **Parar → escolher B/Refrão/etc. → Iniciar → Contagem (se ligada) → Parte escolhida**.
- Com contagem desligada: o próximo **Iniciar** pula a contagem. A seleção da parte continua disponível normalmente.
- WAV cadastrado de **1 compasso** com seleção de **2 compassos**: toca duas vezes o WAV, sem loop infinito; WAV de 2 compassos com seleção de 1 compasso: toca apenas o primeiro. O arquivo na biblioteca não é alterado.
- A escolha de contagem é uma preferência de **apresentação local por música/ritmo e aparelho** (armazenamento do navegador), sem alterar o cadastro na nuvem. No outro dispositivo, a opção começa pelo padrão do cadastro, podendo ser alterada no próprio Modo Live.

### Crash 1, 2, 3: ataques por cima da bateria

- Os identificadores de WAV existentes **`crashStop`, `crashStop2`, `crashStop3`** são mantidos para compatibilidade e não exigem reimportar os áudios. A função musical passou a ser **ataque adicional**, não encerramento.
- Tocar um botão Crash durante Parte A, Parte B, Refrão ou outro loop contínuo agenda o WAV inteiro para o **próximo tempo 1** do compasso atual.
- O WAV toca **junto com o loop** sem paralisar, substituir, silenciar ou reiniciar o loop. A cauda do prato continua tocando durante as outras partes; cada crash tem seu próprio slot.
- Se o WAV de crash contiver silêncio inicial e prato no 2º, 3º ou 4º pulso, a reprodução do **arquivo** ainda inicia no tempo 1, mantendo o deslocamento gravado dentro dele.
- Os comandos de pedal **`part:crashStop`** das versões anteriores continuam funcionando e passam a acionar o ataque adicional. Os novos mapeamentos aparecem como **Crash 1/2/3**.
- Um crash só pode ser acionado quando um loop musical estiver tocando. Não é disparado no início da contagem de baquetas nem depois de agendado um encerramento.
- Para **parar a música**, usar **Acabamento**, **Final** ou **Parar** — estes recursos permanecem independentes.

## Compatibilidade preservada

Sem alteração do esquema de armazenamento remoto, Netlify Blobs, nome de partes, backup/restauração, fórmulas de compasso, BPM original, entrada com crash, introdução musical (única/repetida), viradas inteligentes e manuais, partes personalizadas ou repertórios.

## Validação e publicação

- **105/105 testes automatizados locais aprovados** via `npm test` (Node 22).
- Sintaxe verificada com `node --check`.
- **Build local de produção não foi concluído**: o ambiente não dispõe das dependências npm (`esbuild`). O arquivo `dist/netlify-client.js` é um placeholder e **precisa ser gerado pelo `npm run build` no Netlify**; **não publicar a pasta `dist` diretamente**.
- Publique usando **o mesmo repositório GitHub e o mesmo site Netlify** da V19. Confirme o build, depois teste pelo Permalink no PC e iPhone, com WAVs reais, antes de promover à produção.

Consulte `INSTRUCOES_PUBLICACAO_NETLIFY.txt` para uma sequência curta de verificação.
