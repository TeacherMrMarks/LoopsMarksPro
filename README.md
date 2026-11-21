# Loops Marks Pro — V6 (Netlify Identity)

**Base musical:** V4, preservando entrada com crash, loop contínuo, viradas adaptativas, viradas manuais e finais. **Mudança principal:** retorno ao Netlify Identity (convite com e-mail e recuperação de senha) em substituição ao login próprio da V5. A V6 mostra a versão na tela de login e junto à conta.

## Publicação no MESMO projeto

1. Guarde a V4/V5 como backup. Extraia este ZIP e envie seu conteúdo, não o ZIP fechado, para a raiz do mesmo repositório GitHub `LoopsMarksPro`.
2. No Netlify: Base directory **vazio**; Build command `npm run build`; Publish directory `dist`; Functions directory `netlify/functions`. O Netlify instalará dependências `@netlify/identity`, `@netlify/blobs`, `fflate` e `esbuild` e fará o build.
3. Em **Identity**, mantenha Netlify Identity habilitado, preferencialmente cadastro **Invite only**. Convide o seu e-mail em Identity > Users. Você receberá um link para configurar sua senha.
4. **IMPORTANTE:** o link de convite ou recuperação do Netlify normalmente redireciona para o **endereço principal do projeto** (`nome.netlify.app`), não para o Permalink de um deploy em teste. **Publique a V6 no endereço principal antes de solicitar novo e-mail.** Sem isso, você pode cair na tela de uma versão antiga, mesmo se a V6 funcionar no Permalink.
5. Abra o e-mail **mais recente** no navegador, com internet. A V6 deve mostrar *Criar senha de acesso* (convite) ou *Definir nova senha* (recuperação), não a Central. Escolha e confirme uma senha de pelo menos 8 caracteres. Só depois entre pelo login normal.
6. As variáveis `LOOPS_ADMIN_USERNAME`, `LOOPS_ADMIN_PASSWORD` e `LOOPS_SESSION_SECRET` da V5 **não são usadas** pela V6; podem ser eliminadas do projeto quando tudo estiver validado. Não envie senhas ou tokens de redefinição por chat.

## Sessão, armazenamento e backup

- Login Netlify Identity com sessão persistente gerenciada pelo SDK, sem exigir novo e-mail a cada abertura normal. Sessões podem expirar ou exigir novo login após logout.
- Mesmo armazenamento no Netlify Blobs da V4: `loops-v3-songs`, `loops-v3-wavs` e `loops-v3-history`, segregado pelo ID do usuário da Identity. O backend só permite acessar os dados do usuário autenticado.
- Salvamento local imediato e sincronização com Netlify quando conectado. No celular, baixar os áudios antes de tocar offline. O backup ZIP mantém as funcionalidades da V4.
- Se algum conteúdo foi armazenado usando a conta personalizada da V5, ele não aparece automaticamente na conta Identity; será preciso fazer backup/importação conforme necessário.

## Observações e testes

- Na recuperação, V6 prioriza o link recebido por e-mail mesmo quando já existe sessão. Se o link for inválido/expirado, mostra um aviso e não ignora o erro abrindo diretamente a Central. Também evita deixar um token de recuperação processado na barra de endereço.
- Evite pedir dezenas de links sucessivos, pois o provedor pode aplicar limites de envio.
- Depois de publicar, confira: rótulo **V6** no endereço principal; convite; reset de senha; login; salvamento Netlify; backup; download offline; e viradas no iPhone em modo avião.
- Verificação local `npm test` e checagens sintáticas executadas. **O login com um token real do Netlify e a reprodução no iPhone exigem teste na publicação**.
- Os arquivos de `dist/netlify-client.js` servem como placeholder e são gerados durante `npm run build`; não publique apenas a pasta `dist` pelo Drop.
