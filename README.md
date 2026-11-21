# Loops Marks Pro — V12

Versão para o **mesmo GitHub e Netlify**. Criada a partir da V11, preservando os stores de WAVs, músicas, pastas e repertórios.

## Novidades da V12

- **Gerenciamento recolhível:** Central de Loops, Músicas, Ritmos, Repertórios e Pastas agrupados num menu. A barra lateral inteira também pode ser recolhida no computador.
- **Biblioteca principal:** a lista e o campo de pesquisa saíram do menu estreito. As músicas e ritmos são apresentados em cartões no painel principal; clicar abre o editor em toda a largura disponível.
- **Configurações em janela flutuante:** conta, Backup/Restauração, Gerenciar Link, Controle por Pedal, Sincronizar, Sair e X para fechar.
- **Editor retrátil:** clique em **Dados e comportamento musical** para esconder/exibir tipo, pasta, BPM, identificação e regras de virada. O modo escolhido permanece no aparelho.
- **Pedal Bluetooth HID:** seis comandos configuráveis, com botão **Aprender** para cada pedal, usando as teclas que a pedaleira realmente envia. Configure pelo menu da Central ou pelo pequeno ícone de pedal no Modo Live. O mapeamento fica salvo **localmente no aparelho** (inclusive offline). Ele deve ser ensinado novamente no iPhone caso tenha sido configurado em outro computador. Não foi necessário modificar o motor de viradas.
- **Link pessoal e revogável de músico:** em Configurações, gere um link seguro de **somente leitura**, copie, renove ou revogue. A nuvem valida cada acesso antes de fornecer listas e WAVs. A revogação impede novos acessos online; o aplicativo verifica periodicamente a validade enquanto conectado e tenta limpar o cache do músico revogado. Uma cópia já baixada pode funcionar **até 48 horas offline**, pois a internet é necessária para receber uma revogação.
- **Link permanente e atualizações:** o link principal `.netlify.app` permanece válido quando uma nova versão é publicada nesse domínio; o worker prioriza a versão nova quando o aparelho está online. O app nunca recarrega a interface durante a execução. O **Permalink de preview fica fixo** na versão testada, mas usa a mesma autorização e pode ser revogado. O atalho PWA do músico usa um manifesto personalizado para abrir diretamente no player, com a chave do link.
- **Modo Live mantido:** logotipo, visor da parte atual, BPM, loops, crash, viradas, acabamento, finais, repertório e download offline. O pequeno ícone de pedal foi acrescentado no topo.

## Seguranca e pré-requisitos

- A Central Administrativa continua usando **Netlify Identity**; não usamos a senha e as variáveis da V5.
- O acesso do músico por link usa um token aleatório armazenado no novo store **`loops-v12-access`**. Ele tem validade de 90 dias e somente um link permanece ativo por conta. O token é sensível como uma senha: não o exponha publicamente.
- O endpoint do músico (`netlify/functions/loops-musician.mjs`) permite **somente GET** de catálogo, repertório e áudio. Não tem operações de criação, exclusão ou edição. O endpoint administrativo ainda exige Netlify Identity.
- Para que o link do músico abra sem **Sign in to Netlify**, o site/página de preview correspondente precisa permitir acesso dos visitantes (Project visibility/Deploy protection). A proteção dos dados fica nas Functions. Não confunda a proteção da plataforma com a autenticação do aplicativo.
- Instale o PWA no Safari após abrir o **link permanente** e teste o atalho. Confirme que o manifesto personalizado foi aceito pelo iOS antes de depender dele.
- **Pedal:** use um modelo Bluetooth HID em modo teclado, não MIDI puro. A resposta real depende do modelo e do Safari; teste com o iPhone 11 antes de apresentações.

## Atualização

1. Salve um **backup completo** na V11, preservando os WAVs, e guarde o ZIP da V11.
2. Extraia este pacote e envie **seu conteúdo, não o ZIP fechado**, para a raiz do **mesmo** repositório GitHub.
3. No Netlify, mantenha: Base directory vazio, Build `npm run build`, Publish `dist`, Functions `netlify/functions`.
4. Se a publicação automática estiver bloqueada, use o **novo Permalink da V12** para testar; não use `Trigger deploy` repetidamente.
5. Teste as telas, o pedal no navegador e a geração/revogação de um link. Para testar a própria versão V12 no celular, copie **Link de teste**. Depois de aprovar e publicar a V12 no endereço principal, use **Copiar link permanente**.
6. Teste primeiro com WAVs de demonstração. Confirme downloads, transições, repertórios, sessão offline e abertura pelo ícone no iPhone 11 em modo avião, antes de tocar uma cerimônia.

## Persistência

- Músicas: `loops-v3-songs`; WAVs: `loops-v3-wavs`; histórico: `loops-v3-history`; pastas e repertórios: `loops-v11-library` — **preservados e sem migração destrutiva**.
- Novo: `loops-v12-access` para a autorização do link do músico.
- Preferências de layout e pedal: armazenamento local do próprio navegador/aplicativo (não substituem o backup do repertório).

## Validação

- Testes automatizados locais de autenticação, Cloud/Netlify Blobs simulado, link revogável, leitura do músico, viradas, biblioteca e interface.
- Prévia estática da Central avaliada em 1440 × 900, sem rolagem horizontal.
- O `npm run build` precisa baixar `esbuild` e outras dependências; o ambiente de montagem não tinha `node_modules`, portanto o build completo **não foi validado localmente**. Validar pelo Netlify.
- **Ainda não testado com pedal físico nem com reprodução real no iPhone.** Os 53+ testes são automatizados, não substituem ensaio de áudio nem teste de revogação numa implantação real.
