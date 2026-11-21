# Loops Marks Pro — V8

**Versão oficial de correção de autenticação**, criada a partir da V6 com a Central de Cifras Studio Marks Pro como referência de fluxo. A Central de Cifras original não foi modificada.

## O que mudou

- Netlify Identity com sequência `getSettings` → `handleAuthCallback` → `getUser`/`refreshSession`.
- Verificação adicional, após login ou restauração de sessão, por `/.netlify/functions/loops-session`, executada no servidor.
- Convites e recuperação de senha continuam processados no app, com prioridade sobre uma sessão antiga. Convite é aceito pelo token; recuperação usa `updateUser({password})`.
- Se uma senha foi redefinida mas houve falha posterior ao confirmar a sessão, o aplicativo indica que é possível entrar com a **nova senha**, em vez de exigir outro e-mail.
- Erros de limite de tentativas, token vencido e falha de conexão com mensagens diferentes.
- Diagnóstico discreto na tela de login: **Verificar configuração de acesso** verifica Identity e a função de sessão sem solicitar e-mail nem alterar senha.
- Acesso offline apenas com sessão anteriormente confirmada no servidor e gravada há no máximo 48 horas; logout limpa o registro. **Não existe bypass de login nem acesso aos dados de outra conta.**
- Identificação **V8** e cache atualizado sem apagar IndexedDB nem os WAVs.

## Mantido

- Mesmo site Netlify e mesmo repositório GitHub.
- Mesmos bancos Netlify Blobs: `loops-v3-songs`, `loops-v3-wavs`, `loops-v3-history`.
- Mesmo armazenamento local `loops-marks-data` por conta; mantém seus dados da V4/V6.
- Motor da V4/V6: loop com crash apenas na entrada, loop contínuo, viradas adaptativas, manuais, transições e acabamentos.
- Backups ZIP, download offline, sincronização e player do modo ao vivo.

## Publicação

1. Guarde a V6 e seus backups. Extraia o ZIP e envie o conteúdo para a raiz do mesmo repositório `LoopsMarksPro`.
2. Mantenha no Netlify: Base directory **vazio**; build `npm run build`; publish `dist`; functions `netlify/functions`.
3. Identity habilitado e cadastro preferencialmente por convite. Não precisa das variáveis de senha da V5 (`LOOPS_ADMIN_*`, `LOOPS_SESSION_SECRET`).
4. Links de convite ou recuperação **abrem o endereço principal**, não necessariamente um Permalink. Promova o deploy V8 já pronto e confirme **V8** na tela antes de pedir outro e-mail.
5. Se estiver com limite do Identity por muitas tentativas, o aplicativo não consegue liberar o bloqueio. Não repita pedidos; aguarde o próprio Netlify permitir novos envios.
6. Teste primeiro login e sessão, depois a gravação e sincronização de uma música pequena, o backup e, finalmente, WAVs reais em modo avião no iPhone.

## Segurança e limitações

A função `loops-session` retorna só ID/e-mail da conta autenticada e não modifica dados. A função `loops-api` continua verificando o Identity em cada operação e isolando registros pelo ID. Outros usuários convidados ao mesmo Identity podem usar suas próprias bibliotecas, mas **não** os áudios de outras contas.

**Esta versão tem testes automatizados locais; a validação com convites e recuperação reais do Netlify, a compilação npm e o teste do player no celular precisam ocorrer na publicação.** O limite de e-mails é uma restrição do próprio Netlify, não é eliminado pelo código.


## Correção V8 — Modo Live
- Cadastro aparece no repertório assim que é salvo, mesmo com WAVs ainda incompletos.
- Se faltarem loops contínuos, a música permanece visível e informa exatamente o que falta.
- Qualquer parte contínua cadastrada (Parte A, Parte B, Refrão etc.) pode iniciar a reprodução; não há exigência fixa da Parte A.
- Dados existentes, Netlify Identity, Netlify Blobs, backups, WAVs locais e motor de viradas preservados.
- Deploy no **mesmo projeto GitHub / Netlify**. Não é necessário recadastrar músicas.
- Verificar **V8** no rodapé para confirmar que não está vendo o cache de outra versão.
