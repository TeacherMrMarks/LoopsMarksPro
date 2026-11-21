# Loops Marks Pro — V18

Atualização incremental da V17. As alterações abaixo preservam o esquema de WAV existente e o armazenamento de músicas, ritmos, repertórios, links e pastas.

## Novidades

- **Introdução 1 · Contagem de baquetas:** slot WAV opcional `countIntro`, com número de compassos editável. Executa uma vez antes da introdução musical. Pode ser desativada por cadastro sem excluir o WAV.
- **Introdução 2 · Musical:** continua no slot `intro` da V17. É possível configurar **tocar uma vez e seguir automaticamente para a parte inicial** (padrão) ou **repetir até o comando do músico pelo celular, pedal ou Central**. O player respeita os compassos e o BPM de cada cadastro.
- Nas **Configurações** da conta administrativa há **Redefinir minha senha**, com confirmação. A operação atualiza a senha da própria sessão autenticada pelo Netlify Identity; exige internet. Não altera links de músicos nem guarda senha no backup.
- **Compatibilidade:** os cadastros antigos com apenas `intro` continuam funcionando no modo original. A exportação e a restauração de backup incluem os novos campos.

## Publicação

1. Faça backup completo da V17. Extraia o ZIP para o repositório sem apagar os dados do Netlify Blobs.
2. O Netlify deve executar **npm install** e **npm run build** para gerar `dist/netlify-client.js` com Netlify Identity e fflate. O arquivo incluído em dist é um **placeholder** de build e não pode ser usado para publicação direta sem compilação.
3. Verifique os logs do deploy e teste WAVs reais, viradas, ritmos/músicas, comando via pedal e a alteração de senha em uma conta de teste.

**Limite de BPM herdado da V17:** ±10 BPM em relação ao WAV original.
**Verificação:** testes Node; compilação de produção não concluída localmente por indisponibilidade das dependências.
