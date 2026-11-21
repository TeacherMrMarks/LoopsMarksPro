# Loops Marks Pro — V9

Correções aplicadas à V8 mantendo o mesmo Netlify Identity, Blobs, música cadastrada e ZIP de backup.

1. **Modo Live:** sempre usa metadados atualizados da música. Não substitui a Parte A recém-cadastrada por um índice offline antigo.
2. **Áudios:** na seleção de uma música com WAV ausente no aparelho, faz download dos arquivos restantes quando online, verifica a integridade e prepara o player. A mensagem indica progresso ou erro real, em vez de apenas “Aguardando áudio”. Para tocar offline, abra a música uma vez conectada e confirme que ficou pronta.
3. **Central:** cada WAV tem botão **Ouvir / Parar** independente de **Trocar**. Ouvir lê o arquivo local (ou nuvem quando necessário) sem alterar o cadastro.
4. **Link do músico:** na Central, **Gerar link do app** cria um endereço `?modo=musico`, com opção de abrir, copiar e compartilhar. Esse endereço esconde toda a Central, os menus de edição e os botões de gerenciamento, inclusive se aberto em computador. O ícone de PWA instalado também abre direto no Modo Live.
5. **Versão V9** em login e aplicativo.

## Publicar
Extraia o ZIP e envie o conteúdo para a raiz do repositório GitHub já vinculado ao Netlify. Use o mesmo site, as mesmas Functions (`netlify/functions`) e o mesmo build `npm run build`, publish `dist`. Para recuperar senha no Identity, o site principal precisa estar na versão correta. Faça backup da V8 antes de atualizar.

## Atenção
O link `?modo=musico` separa **a interface**, mas não cria permissões novas de servidor. O login atual continua sendo o mesmo usuário autorizado do Netlify Identity e dados permanecem isolados por usuário. Para compartilhar biblioteca com músicos usando contas diferentes e impedir edição até via URL, será necessário controle de papéis e biblioteca compartilhada no servidor. Não compartilhe a conta administrativa com pessoas não autorizadas.

A reprodução musical e download no iPhone em modo avião ainda exigem testes reais antes de uma cerimônia. A versão não apaga músicas já cadastradas nem muda o formato dos backups.
