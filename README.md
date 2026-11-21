# Loops Marks Pro — V11

**Versão para GitHub + Netlify.** Base preservada da V10, com Netlify Identity, Netlify Blobs, download de WAVs e player de viradas inteligentes.

## O que mudou

- **Central Administrativa redesenhada**: não há mais os cartões redundantes de quantidade de músicas, nuvem e acesso ao músico. A navegação, busca, seleção de arquivos, sincronização e configurações estão na coluna esquerda; o editor ocupa toda a região direita.
- **Bibliotecas separadas:** `Músicas` (baterias específicas) e `Ritmos` (levadas reutilizáveis), com pasta opcional por cadastro. Registros da V10 que ainda não têm tipo aparecem como Músicas.
- **Pastas personalizadas:** criar, renomear, selecionar e excluir pastas por biblioteca. Excluir uma pasta **não exclui** músicas ou WAVs: os itens ficam sem pasta.
- **Músicas baseadas em ritmos:** no editor de um ritmo, clique em “Criar música a partir deste ritmo”. Os novos cadastros reaproveitam as referências dos mesmos arquivos WAV sem duplicá-los na nuvem. O cadastro resultante pode ser editado separadamente.
- **Repertórios:** criar, renomear, definir data, duplicar, excluir; misturar músicas e ritmos, definir a ordem (subir/descer) e um BPM opcional por item. O ajuste de BPM durante a apresentação fica limitado a ±10 BPM do original.
- **Modo Live:** gaveta com abas `Tudo`, `Músicas`, `Ritmos` e `Repertórios`. Ao selecionar um repertório, o player abre seu primeiro item, mostra posição e permite avançar/voltar. A troca é confirmada se a música atual estiver tocando.
- **Offline:** baixar a música selecionada ou todos os WAVs de um repertório, sem executar nenhum acesso à nuvem durante a reprodução. O arquivo `library-model.js` faz parte do cache do aplicativo.
- **Gerar link do aplicativo:** um comando único no menu Configurações; no Permalink gera o link do próprio Permalink, em produção gera o link de produção. Não usa os três botões anteriores.
- **Backup ZIP:** esquema V4 com tipo, pasta, repertórios e ordem, além dos WAVs. A restauração também lê os backups anteriores (esquema V3), sem substituir os cadastros existentes.

## Segurança e compatibilidade

- Os cadastros e WAVs já salvos nas versões anteriores permanecem nos stores `loops-v3-songs` e `loops-v3-wavs` do Netlify Blobs. **Não apague esses stores**.
- Pastas e repertórios são armazenados separadamente no novo store `loops-v11-library`, sempre por usuário do Netlify Identity. Nenhum arquivo WAV é movido para o GitHub.
- Todos os acessos ao banco, backup em nuvem e downloads continuam passando pela autenticação do Netlify Identity.
- Se a mesma biblioteca de pastas/repertórios for editada simultaneamente em dois aparelhos, a aplicação mantém a edição local pendente e mostra uma mensagem de conflito em vez de sobrescrever silenciosamente a versão remota. Para evitar conflito, conclua a sincronização de um aparelho antes de editar no outro.
- O modo músico `?modo=musico` continua **sem interface administrativa**. O próprio login Identity ainda é necessário para acessar dados protegidos.

## Publicação no mesmo projeto

1. **Antes da atualização, exporte um backup completo na V10** e guarde o ZIP original da V10.
2. Descompacte este pacote; envie **os arquivos internos diretamente à raiz** do mesmo repositório GitHub `LoopsMarksPro`.
3. No Netlify: Base directory vazio, Build command `npm run build`, Publish directory `dist`, Functions directory `netlify/functions`.
4. Deixe Auto Publishing Locked, se desejar. Abra o novo **Permalink** após concluir o deploy. Verifique o rodapé/cabeçalho `V11`.
5. Entre no Identity com sua conta existente. Confirme que a música de teste da V10 ainda está em Músicas, teste a criação de um Ritmo, uma Pasta e um Repertório, confira `Sincronizado` e abra o app do músico pelo link gerado.
6. No iPhone, abra no Safari, selecione um repertório, **baixe todos os seus WAVs** e teste em modo avião. Só então promova o deploy existente para produção.

## Testes

- `npm test`: 53 testes locais passando, cobrindo o motor de áudio anterior, autenticação, validações, armazenamento da biblioteca e renderização inicial dos painéis.
- `node --check`: verificação sintática dos módulos JavaScript.
- **Não foi possível executar o build npm completo ou a prévia em navegador nesta sessão**: as dependências npm não estavam instaladas e o navegador de testes local bloqueou a navegação. Valide o build no Netlify pelo Permalink antes de promover à produção.
- **A reprodução real offline e a sincronização entre dois dispositivos ainda exigem teste no iPhone 11.** Não considerar a V11 aprovada para eventos ao vivo antes desses ensaios.
