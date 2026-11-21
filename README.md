# LOOPS MARKS PRO — V5

## O que é

Versão oficial com **login próprio (usuário e senha)** e sem Netlify Identity. O login acontece em Netlify Functions, e os WAVs, cadastros, mapas de viradas, versões anteriores e backups manuais são tratados pelo Netlify Blobs + armazenamento local do dispositivo. O motor musical e a interface da V4 foram mantidos (loops com crash de entrada, contínuos sem crash, viradas manuais/adaptativas, acabamentos, backup ZIP).

**Atenção:** nenhum usuário/senha é publicado nos arquivos. O aplicativo bloqueia o acesso ao servidor enquanto faltarem as três variáveis de ambiente obrigatórias.

## Configuração única — mesmo repositório e mesmo projeto Netlify

1. Faça backup do que já estiver cadastrado na versão anterior. Guarde o ZIP anterior antes de sobrescrever os arquivos do GitHub. Dados que já estiverem no Netlify Blobs não serão apagados pela publicação.
2. Extraia o ZIP e envie **os arquivos internos diretamente à raiz** do mesmo repositório GitHub `LoopsMarksPro`, substituindo os da V4. Não crie outro projeto.
3. No Netlify: **Project configuration → Environment variables**. Cadastre estas variáveis **com escopo Functions e para Production + Deploy Previews** (ou para todos os contextos, se usar os dois tipos de deploy):

   | Nome | Valor |
   | --- | --- |
   | `LOOPS_ADMIN_USERNAME` | `marks` |
   | `LOOPS_ADMIN_PASSWORD` | Senha forte exclusiva, com no mínimo 16 caracteres |
   | `LOOPS_SESSION_SECRET` | Chave aleatória distinta da senha, com no mínimo 32 caracteres |

   Não coloque os valores da senha ou da chave em arquivos do GitHub ou em `netlify.toml`. Para trocar a senha depois, altere a variável e publique uma nova versão. A troca invalida os cookies de sessão anteriores.
4. Deixe as configurações de build da V4: **Base directory** vazio, **Package directory** vazio, **Build command** `npm run build`, **Publish directory** `dist`, **Functions directory** `netlify/functions`.
5. Publique **depois** de configurar as três variáveis, para evitar builds extras e permitir que as Functions recebam os valores. Espere o deploy concluir e confirme a indicação **V5**.
6. Abra o **domínio principal** ou o Permalink da V5. Digite o usuário e a senha cadastrados no Netlify. A sessão usa cookie `HttpOnly`, `Secure`, `SameSite=Lax` válido por até 90 dias ou até você sair/trocar de senha. Cada domínio/Permalink terá sua própria sessão.
7. Teste com uma música pequena (um WAV de Parte A e uma virada): verifique **Salvar na nuvem**, feche/abra o navegador, abra no segundo aparelho, baixe para offline e depois teste o backup ZIP.

### Publicação privada versus login próprio

A visibilidade **Private** do projeto Netlify acrescenta uma barreira de login do próprio Netlify antes de carregar a aplicação. Para usar **apenas** o login próprio Loops Marks Pro entre aparelhos, o site de arquivos estáticos precisa ser acessível sem autenticação do Netlify (visibilidade Public, se seu plano permitir). A interface de login fica acessível, mas as Functions e os dados no Blobs continuam exigindo cookie de sessão validado no servidor. O endereço do site não concede acesso à biblioteca.

### Cuidados com atualização e dados existentes

- A V5 mantém as três lojas site-wide de Blobs `loops-v3-songs`, `loops-v3-wavs` e `loops-v3-history`; não apaga os objetos existentes.
- **O identificador do administrador agora é `marks-pro-admin`**, diferente do UUID da antiga conta Netlify Identity. Dados antigos registrados com o UUID anterior **não aparecerão automaticamente** na biblioteca V5. Se você já salvou músicas na versão antiga, exporte o **Backup completo** pela versão anterior e restaure pelo novo login. Não exclua a instalação antiga, seus WAVs ou backups até confirmar a transferência. Para bibliotecas grandes, teste a restauração primeiro com uma música.
- Salvar **local** e salvar **na nuvem** não são a mesma operação. Verifique o estado **Sincronizado** antes de apagar a cópia local. A sincronização usa revisão por cadastro e verifica a integridade SHA-256 dos WAVs.
- A sincronização ocorre quando o aparelho está online e a reprodução ao vivo não está em andamento. Os áudios previamente baixados funcionam offline nos dispositivos compatíveis; o navegador pode limpar o armazenamento local, portanto mantenha backups externos.
- O limite atual de upload é 32 MB por WAV e o backup completo em ZIP é limitado a 420 MB.
- Ao abrir outro **Permalink**, você poderá precisar entrar novamente: os cookies não são compartilhados entre diferentes domínios.

## Segurança e limitações

- Conta exclusiva de administrador no servidor; não existem senhas no frontend. O valor de `LOOPS_SESSION_SECRET` deve ser diferente da senha e aleatório.
- Senha protegida via variáveis de ambiente do Netlify; sessão assinada e enviada como cookie HttpOnly. O servidor valida a sessão **também nos endpoints de catálogo, upload de WAV, download, salvamento e restauração**.
- Cookies de sessão não impedem alguém com acesso ao aparelho desbloqueado de usar o app. Clique em **Sair da conta** quando precisar revogar o acesso local; altere a senha no Netlify para invalidar todas as sessões.
- Antes de usar em cerimônias, teste várias horas com seus WAVs reais, em modo avião no mesmo iPhone e saída de áudio da mesa. Não existe garantia técnica de latência zero em todo navegador/aparelho.
- **Não é possível configurar a senha automaticamente apenas publicando o ZIP.** O administrador deve cadastrar três variáveis no painel Netlify e publicar o deploy depois.

## Testes

- `npm test`: testes locais de login, rejeição de credenciais incorretas, sessão, proteção contra acesso sem login e origem externa, Netlify Blobs simulado (WAV por partes, SHA-256 e histórico), além do motor de áudio V4.
- `npm run build`: compila o utilitário de backup `fflate` para o navegador e atualiza a chave de cache PWA. Precisa de dependências instaladas via npm. O build completo do Netlify e a reprodução no celular devem ser conferidos depois da publicação.
