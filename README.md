# Loops Marks Pro — V16

Atualização incremental da **V15**, voltada apenas à identificação do compasso, à duração dos WAVs e ao agendamento musical correspondente. As cores, layout, links do músico, autenticação Netlify Identity, Netlify Blobs, diretórios, paleta, cadastros e a lógica anterior de viradas e crash permanecem preservados.

## Nova fórmula de compasso — músicas e ritmos

Na aba **Dados**, o antigo campo genérico "Tempos / compasso" virou **Fórmula de compasso**. Opções: 2/4, 3/4, 4/4, 5/4, 6/4, 7/4, 2/2, 3/8, 5/8, 6/8, 7/8, 9/8 e 12/8.

A Central diferencia automaticamente a duração de um compasso, a quantidade de pulsos, a posição do tempo 1, as viradas e a troca de parte em cada cadastro. O compasso também aparece no catálogo e no Modo Live. Ritmos e músicas usam o mesmo recurso.

**Importante sobre 6/8:** existem duas maneiras práticas de configurar o BPM de um WAV. A Central oferece **6/8** (2 pulsos de *semínima pontuada* por compasso, apropriado para o blues composto) e **6/8 · BPM de semínima (DAW)** (3 unidades de semínima por compasso, para WAVs exportados pela DAW com BPM da semínima). Ambas exibem "6/8" e agendam o próximo início do compasso corretamente. Escolha o modo que corresponde ao BPM usado no programa em que o WAV foi cortado.

Exemplos no mesmo BPM 80:

| Fórmula / convenção | Duração esperada de um compasso | Exemplo |
|---|---:|---|
| 2/4 | 1,5 s | Country |
| 3/4 | 2,25 s | Valsa, balada |
| 4/4 | 3,0 s | Rock |
| 6/8 (semínima pontuada) | 1,5 s | Blues composto com 2 pulsos |
| 6/8 · BPM de semínima (DAW) | 2,25 s | WAV da DAW em semínima |

O importador não altera o som nem muda silenciosamente o ritmo: ele exige que o WAV corresponda ao BPM e à fórmula de compasso escolhidos. Quando a duração estiver errada, informa a duração necessária de um compasso para ajudar a corrigir o arquivo na DAW. Os acabamentos, finais e ataques Crash permanecem com cauda natural e não são submetidos a essa duração rígida.

## Compatibilidade e segurança

- **Retrocompatibilidade:** músicas e ritmos V15 e anteriores sem o novo campo continuam com o compasso **N/4** correspondente ao número de tempos que já tinham. Nenhum WAV antigo é recodificado, apagado ou migrado.
- **Salvamento/nuvem:** o campo `meter` e a convenção opcional `beatUnit` acompanham o mesmo fluxo de persistência já existente. Há apenas uma validação direcionada no código da função `loops-api.mjs`; as configurações de Netlify e Identity não foram alteradas.
- **Backup/restauração:** os dois campos são incluídos no manifesto e recuperados na importação; os backups anteriores permanecem válidos.
- **Offline:** `meter.js` está incluído no cache do Service Worker para funcionar quando o áudio já estiver disponível no aparelho.
- **Mudança após importar:** se você alterar o compasso de um cadastro com WAVs existentes, verifique a duração deles e, se necessário, faça novo corte/exportação; o sistema não tenta forçar um áudio de 4/4 a se tornar 3/4.

## Como testar antes de publicar

1. Faça o backup da V15 e mantenha o ZIP anterior.
2. Extraia a V16, envie os **40+ arquivos e pastas extraídos** para a raiz do mesmo GitHub e mantenha o build existente `npm run build`, publicação `dist`, funções `netlify/functions`.
3. Abra o Permalink do deploy de teste.
4. Crie um **ritmo 3/4** a 80 BPM e importe um loop de 2,25 s por compasso (4,5 s para 2 compassos).
5. Crie um **ritmo 6/8** a 80 BPM e importe um loop de 1,5 s por compasso, ou selecione a variante **BPM de semínima (DAW)** e use 2,25 s por compasso.
6. Confira as trocas de parte, viradas, o tempo 1 e o player no iPhone, incluindo o uso offline.
7. Confira o backup/restore de um ritmo ou música 6/8. Somente promova a V16 para produção após passar nos testes reais de palco.

## Testes

Execute `npm test` para validação automatizada. O resultado de testes no ambiente local **não substitui** o build via Netlify e a reprodução dos arquivos WAV no iPhone. O arquivo `dist/netlify-client.js` do ZIP é um placeholder compilado durante `npm run build` (como nas versões anteriores).
