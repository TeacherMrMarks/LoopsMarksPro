# LOOPS MARKS PRO — V3 (Netlify)

**V3 construída a partir do pacote da V2.** Preserva o motor de áudio, a interface, as viradas automáticas/manuais, as partes, o mapa de transições e a reprodução local. Substitui o protótipo Supabase por **Netlify Identity + Netlify Blobs + Netlify Functions**.

> **Esta versão não é um site estático para Netlify Drop.** O recurso de login, upload e backup em nuvem requer que o Netlify execute o build e publique a pasta `netlify/functions`. Envie os ARQUIVOS extraídos para um repositório GitHub, nunca somente o ZIP. Se usar o Netlify Drop com esse código antes do build, o login não funcionará.

## Novidades V3

- **Login real:** e-mail e senha via Netlify Identity. A sessão pode ser retomada após fechar/reabrir; expiração, revogação e limpeza do navegador podem exigir novo login.
- **Salvamento automático:** primeiramente no IndexedDB do aparelho, com fila de sincronização para o Netlify. Indicadores informam se o dado está efetivamente na nuvem.
- **Áudios na nuvem:** arquivos WAV de até 32 MB em Netlify Blobs, por usuário. Envio em blocos de 1,5 MB para respeitar o limite de Functions; verificação do manifesto antes de publicar música. Download verifica SHA-256.
- **Computador ↔ celular:** biblioteca compartilhada usando a mesma conta. O player usa somente os WAVs previamente baixados e preparados na memória.
- **Modo offline:** os arquivos baixados ficam no armazenamento privado do PWA no aparelho; o navegador pode limpar esses dados em determinadas condições. O modo avião precisa ser ensaiado no dispositivo real.
- **Central de Backup:** botão **Backup / Restaurar** na Central Administrativa: backup completo (dados+WAVs), configurações (sem WAVs), áudio+índice (WAVs+metadados); ZIP para download, importação com restauração **em novas cópias**, opção de importar cadastros locais da V2.
- **Histórico automático na nuvem:** a cada alteração publicada, uma cópia da versão anterior da música é armazenada em `loops-v3-history`. As versões referenciam WAVs mantidos no Blob Storage. **Não são backups independentes dos arquivos de áudio** — para segurança real, faça backups completos em ZIP e guarde fora do Netlify.
- **Gerar link do app:** botão existente na V2 preservado, usando o endereço de produção com `?modo=ao-vivo`.

## COMO PUBLICAR (GitHub + Netlify)

1. Extraia `Loops-Marks-Pro-V3.zip`.
2. No **GitHub**, crie um repositório para esse projeto (ou utilize o repositório conectado ao site correto). Envie todos os arquivos e pastas **da raiz**, incluindo `netlify.toml`, `package.json`, `dist/`, `netlify/functions/`, `scripts/` e `src/`. **Não altere seu projeto de Cifras Studio Marks Pro.**
3. No **Netlify**, entre no projeto associado ao GitHub, ou crie um novo projeto com **Import from Git**. Para o repositório na raiz, configure:

   | Configuração | Valor |
   |---|---|
   | Base directory | (vazio) |
   | Build command | `npm run build` |
   | Publish directory | `dist` |
   | Functions directory | `netlify/functions` |

   O `netlify.toml` já define os comandos. O Netlify deverá instalar as dependências de `package.json` no build. A build deve gerar `dist/netlify-client.js` (substituindo o stub de desenvolvimento).
4. Após a publicação, no projeto Netlify, abra **Identity** → **Enable Identity**. Em **Registration preferences**, escolha **Invite only** para evitar contas desconhecidas. Em **Identity → Users**, convide seu próprio e-mail. Conclua o convite e crie a senha. O login é do Identity, não da conta Netlify usada para publicar.
5. Confira em **Data & Storage → Blobs** depois da primeira sincronização. O app cria automaticamente os stores `loops-v3-songs`, `loops-v3-wavs` e `loops-v3-history` ao usá-los. Não é necessário criar projeto Supabase nem configurar chave pública no navegador.
6. Abra o endereço `.netlify.app` da **publicação vinculada ao GitHub**. Faça login. Na Central, cadastre uma música, importe um WAV e aguarde o texto **Sincronizado**. No outro aparelho, faça login com a mesma conta, veja a música e toque **Baixar para offline**. Use o botão **Gerar link** para compartilhar a URL do Modo Live.
7. Na Central, clique em **Backup / Restaurar** e faça o seu primeiro **backup completo ZIP**. Guarde-o também em HD, computador ou outro serviço, independentemente do Netlify.

**Importante:** se o projeto estiver marcado como *Private* por proteção de conta do Netlify, isso pode exigir login no painel Netlify também para visitar a URL. Para acesso simples no celular, deixe o site acessível e proteja os dados com o Netlify Identity. A API já exige usuário autenticado e restringe os dados a `user.id`.

## TRANSFERIR A V2

A V3 **não apaga nem altera os arquivos da V2**, pois é um pacote separado. Cadastros da V2 feitos no mesmo navegador em `Demonstração local` podem ser recuperados pela opção **Importar cadastros locais V2** no painel Backup. Se a V2 foi usada em outro dispositivo ou perfil, a opção não encontrará esses dados; é preciso acessar a V2 naquele mesmo perfil. Faça antes uma cópia dos WAVs da DAW.

## REGRAS DE ÁUDIO MANTIDAS

- Introdução e Final tocam uma vez. Partes A/B/C, Pré-refrão, Refrão, Parte baixa/alta repetem até novo comando.
- Viradas automáticas são selecionadas pelo destino, ou pela regra personalizada origem→destino.
- Viradas manuais podem retornar ao loop ou acompanhar uma troca agendada.
- Acabamento e Final têm prioridade e entram musicalmente no ponto agendado; Parar é a interrupção imediata.
- BPM original e compasso por música; variação limitada em ±10 BPM, preparada antes do início. Arquivos WAV com duração fora do compasso são rejeitados.
- O áudio é pré-carregado na memória antes de tocar; não faz requisições ao servidor durante a execução.

## BACKUP / RESTAURAÇÃO

**Backup completo ZIP** inclui `manifest.json` e `audios/<indice>/<parte>.wav`. Nenhum WAV é recomprimido nem convertido. Os backups preservam música, BPM, viradas, transições e as partes existentes no instante da exportação. O ZIP pode ser importado em outra conta, criando novas músicas e novos caminhos de WAV.

**Backup de configurações** não inclui áudio e cria músicas sem WAV ao ser restaurado, para evitar arquivos inacessíveis. Reimporte os WAVs no editor após restaurá-lo. **Backup de áudios** também leva um índice com os metadados necessários à associação das faixas.

A geração de ZIP completo no navegador usa memória e possui limite de segurança de 420 MB por operação nesta V3; para grandes bibliotecas, faça backups menores em etapas ou mantenha também os projetos originais na DAW. O backup é iniciado pelo administrador, não é baixado automaticamente para o computador sem interação.

**Histórico automático** guarda as versões anteriores da ficha na nuvem, mas referencia os mesmos arquivos WAV da biblioteca. É um recurso de recuperação de edição, não substitui a exportação completa independente do Netlify.

## TESTES / LIMITAÇÕES

Execute `node --test tests/*.test.mjs` para testar os algoritmos de transição e os contratos simulados da API. Para gerar a versão final do cliente é necessário instalar as dependências de `package.json` e executar `npm run build`. Nesta entrega não foi possível instalar dependências externas na execução local, portanto **o build do Netlify, a autenticação real e os uploads reais ainda não foram verificados na plataforma**.

Faça ensaios no iPhone em modo avião, com o aplicativo instalado na Tela de Início, os WAVs preparados, o aparelho conectado à mesa e a tela ativa. Nenhum PWA garante ausência absoluta de suspensão, problemas de áudio ou limpeza de armazenamento pela plataforma. Mantenha uma alternativa para cerimônias importantes.

Links da documentação oficial: https://docs.netlify.com/manage/security/secure-access-to-sites/identity/get-started/ · https://docs.netlify.com/build/data-and-storage/netlify-blobs/ · https://docs.netlify.com/build/functions/overview/
