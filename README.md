# Loops Marks Pro — V19

Atualização incremental da V18 para corrigir os problemas relatados no Modo Live. Não elimina dados da biblioteca e conserva os formatos dos cadastros, WAVs e repertórios.

## Correções

- A contagem de baquetas **não é loop contínuo**; toca uma única vez e vai para a introdução musical cadastrada ou para a parte inicial. Corrigido agendamento com `Infinity` que podia causar o erro de `AudioBufferSourceNode.start()`.
- A contagem aparece explicitamente na **sequência de abertura do Modo Live**, inclusive no celular, sem ser confundida com uma parte contínua.
- A introdução musical continua configurável: uma vez ou repetição até comando. Agora `introMode` e `countIntroEnabled` são enviados à nuvem e chegam aos músicos.
- **Parar → selecionar Parte A/B/Refrão → Iniciar** executa a mesma contagem WAV antes da parte armada. Isso pula a introdução musical somente nesse reinício de ensaio.
- Com música tocando, tocar **de novo** a mesma parte solicita sua virada automática inteligente e volta à mesma parte. Se não houver virada WAV, entra na parte no próximo tempo 1. Vale para toque na tela e pedal que envia o mesmo comando.
- Posição de onda acompanha o WAV ativo; identificação da parte e do tempo é atualizada no Modo Live.
- Um WAV pode ser importado em várias partes; incluída também a opção **Reutilizar** para referenciar áudio já existente em outro slot do mesmo cadastro, sem duplicar upload.

## Publicação

1. Faça backup completo da V18 e guarde o ZIP anterior.
2. Extraia os arquivos desta V19 sobre o repositório GitHub existente, preservando o site Netlify e seus Blobs.
3. O Netlify deve executar `npm install` e `npm run build` (o `dist/netlify-client.js` fornecido pode ser um placeholder se o build local não conseguir instalar as dependências). Não utilize o ZIP para deploy estático direto sem conferir esse módulo.
4. Valide o log de build do Netlify, o Modo Live em PC e iPhone, a contagem, o retorno em ensaio, viradas e os pedais com WAVs reais.

**BPM:** preservado o limite ±10 BPM da V17/V18.

**Testes locais:** 94/94 aprovados (`npm test`). O build de produção requer as dependências no Netlify; a compilação local foi bloqueada por ausência de acesso ao npm.
