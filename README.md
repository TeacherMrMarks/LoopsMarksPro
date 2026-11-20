# LOOPS MARKS PRO — V3.1 (Login corrigido)

Esta atualização corrige a abertura de links de **recuperação de senha** e de **convite inicial** do Netlify Identity. A V3 reconhecia os tokens, mas não mostrava o formulário para escolher nova senha. Agora:

1. Em Netlify > Identity > Users, envie um convite ou reset de senha.
2. Abra o link do e-mail. O aplicativo apresenta **Criar senha de acesso** (convite) ou **Definir nova senha** (recuperação).
3. Informe e confirme a senha. O aplicativo conclui a ação junto ao Netlify Identity e prossegue para a Central.
4. Na tela de login existe **Esqueci minha senha**, que pede um link diretamente.

## Publicação via GitHub + Netlify

Extraia e envie os **arquivos** deste pacote à **raiz do mesmo repositório** do Loops Marks Pro. Não envie apenas o ZIP. Mantenha as configurações:

- Base directory: vazio
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

O Netlify executa `npm run build` e substitui `dist/netlify-client.js` pelo bundle real do SDK. Não use publicação manual/Drop para esta V3.1.

### Observações

- **Permalink é apenas o endereço da página**, não é um link para redefinir a senha. Sem sessão ativa, ele abre o login.
- O link de recuperação tem token de uso limitado. Caso expire ou já tenha sido utilizado, solicite outro. Não compartilhe o endereço inteiro contendo `#recovery_token` ou `#invite_token`.
- O site precisa estar acessível à conta sem autenticação do painel Netlify para o Identity interno funcionar no celular.
- O motor de áudio, o cadastro de loops, os backups e a API da V3 não foram alterados.

## Arquivos modificados

- `src/netlify-client.js`: exportação das operações de convite e recuperação
- `dist/data.js`: preserva ação pendente e conclui convite/recuperação
- `dist/app.js`: formulários e estados de autenticação
- `dist/styles.css`: estilo dos novos controles
- `dist/netlify-client.js`: stub de desenvolvimento (substituído no build)
- `package.json`, `VERSAO.txt` e este README

## Testes

Execute `npm test` para os testes herdados e, após publicar, confira o fluxo de convite e recuperação com um e-mail real. É indispensável validar a configuração no Netlify, pois testes locais não substituem os e-mails e tokens reais.
