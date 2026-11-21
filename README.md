# Loops Marks Pro — V21

Atualização pontual da **V20** para corrigir a organização da aba **Crash** e ocultar ataques sem WAV no **Modo Live**. A V20 permanece intacta. Esta versão preserva músicas, ritmos, repertórios, WAVs, identidade, backup e pedais.

## Correções V21

1. **Cadastro > aba Crash:** a seção **Crashes adicionais**, com os campos de **Crash 1, Crash 2 e Crash 3**, agora aparece DENTRO da aba Crash, e não na aba Loops. A aba deixa de aparecer vazia. Continuam disponíveis **Ouvir**, **Reutilizar**, **Importar/Trocar** e **Remover**, independentemente de o slot ter áudio.
2. **Modo Live (computador e celular):** um botão Crash só aparece quando há **WAV vinculado** ao respectivo slot. Se não houver WAV, o botão não aparece. Se excluir o WAV, o respectivo botão some quando o player atualizar seu cadastro. Os três slots de cadastro permanecem disponíveis para novos envios.
3. **Sem alterar o motor musical:** Crashes continuam iniciando no **próximo tempo 1**, por cima do loop, sem interromper a bateria. **Acabamento e Final** mantêm seu comportamento anterior. Não alteramos os identificadores `crashStop`, `crashStop2` ou `crashStop3`, para preservar dados e atribuições de pedal.

## Comportamentos preservados da V20

- Contagem opcional antes de iniciar, com 1 ou 2 compassos.
- Introdução musical automática ou em repetição, conforme configuração.
- Viradas inteligentes e comando da mesma parte.
- Reinício de ensaio pela Parte A, B, refrão ou outra parte.
- Reutilização de WAVs, fórmulas de compasso, sincronização e Modo Live de músico.

## Testes e publicação

- **109/109 testes automatizados locais aprovados** com `npm test` (Node). Os novos testes cobrem organização da aba Crash, campos do editor e filtro de ataques sem áudio no Modo Live.
- **Sintaxe JavaScript verificada** com `node --check`.
- O `dist/netlify-client.js` no ZIP continua sendo um **placeholder para desenvolvimento**, substituído por `npm run build` durante o deploy no Netlify. **Não publique a pasta dist diretamente sem build**.
- Use o **mesmo repositório GitHub e o mesmo site Netlify** da V20; faça backup antes, confira o deploy de teste, teste o celular e só então publique oficialmente.
