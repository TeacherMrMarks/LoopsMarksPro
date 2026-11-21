# LOOPS MARKS PRO — V10

**Atualização de interface e experiência de palco, baseada na V9.**

## Central Administrativa

- Continua com editor, biblioteca de WAVs, viradas automáticas/manuais, entradas com crash, mapa de transições e salvamento automático.
- Menu **Configurações** no cabeçalho: **Backup e restauração**, **Gerar link do aplicativo**, conta de e-mail e **Sair da conta**.
- Foi removida a duplicação de Gerar link do cabeçalho, do cartão de acesso e do fim do editor. Nova música continua acessível.
- **V10** ao lado de Loops Marks Pro no topo (inclusive no login).
- O link de músico `?modo=musico` continua escondendo a Central Administrativa.

## Modo Live — celular e computador

- Tela de palco própria, com a marca centralizada, controles de execução e os botões disponíveis por música.
- **Visor em destaque**: parte em execução, indicação de introdução / crash / loop contínuo / virada e próximo destino agendado.
- **Repertório** em botão discreto no topo, com gaveta lateral e busca. A gaveta contém o botão **Baixar para offline / Atualizar arquivos offline**.
- Botões em grades compactas, com adaptação por tamanho da tela e altura disponível. Em iPhones típicos, o painel completo de até sete partes, três viradas e dois finais cabe sem rolar; músicas com maior número de controles ou acessibilidade ampliada podem exigir rolagem.
- No acesso administrativo ao Modo Live, um ícone discreto permite voltar à Central. No link de músico esse botão não aparece.
- Mantidos BPM, forma de onda, preparo do áudio, transições adaptativas, crash inicial, final/acabamento e relógio de áudio da V9.

## Link para o iPhone

1. Abra **Central Administrativa → Configurações → Gerar link do aplicativo**.
2. Dentro de um Permalink de testes, a janela oferece **Copiar link de teste** e **Copiar app oficial**. O app oficial usa o domínio principal `loops-marks-pro.netlify.app` (sem o ID do deploy). Só instale o app oficial depois de publicar a versão aprovada no endereço principal.
3. Abra o link no **Safari** do iPhone e use **Compartilhar → Adicionar à Tela de Início**.
4. Faça login pelo Netlify Identity. A instalação no iPhone pode usar armazenamento separado da aba Safari, por isso pode pedir uma autenticação inicial no app instalado.
5. Abra o repertório pela lista no topo, selecione uma música e use **Baixar para offline**. Confirme o estado **Offline pronto** e teste em modo avião.

**Atenção ao Netlify Private:** se a visibilidade do projeto estiver como `Private`, o Netlify pode exigir login da própria plataforma antes de carregar a interface, inclusive no iPhone. Para abrir diretamente a tela de login do *aplicativo*, altere **Project configuration → General → Visitor access → Project visibility** para `Public`, se estiver de acordo em tornar a interface pública. Essa configuração não torna os dados disponíveis sem autenticação: a API de músicas e WAVs continua exigindo Netlify Identity. Não entregue credenciais administrativas a terceiros.

## Publicação

- Backup e preservação: guarde o ZIP da V9. Não remova seus cadastros do Netlify Blobs nem o cache local do navegador.
- Extraia este ZIP e envie **o conteúdo da pasta** para a raiz do mesmo repositório GitHub.
- Configuração Netlify: Base directory vazio, Build command `npm run build`, Publish directory `dist`, Functions directory `netlify/functions`.
- Pode manter **Auto Publishing Locked** e testar pelo **Permalink** do deploy novo. **Não use Trigger deploy repetidamente**: isso gera novas compilações que podem consumir créditos. Quando aprovada a V10, promova esse mesmo deploy para produção.
- A V10 não modifica o modelo de dados de músicas/WAVs nem as funções de armazenamento do Netlify.

## Testes e limites

- `npm test` executado: 43 testes locais passaram.
- Prévia visual testada em 390×844, 375×667 e 1440×900, sem erro JavaScript no ambiente simulado; botões e gaveta conferidos.
- **Não foi possível rodar `npm run build` neste ambiente** porque o npm registry não estava acessível (`EAI_AGAIN`). O Netlify deverá instalar as dependências no deploy; confira o log.
- O login real, as permissões do Netlify e o áudio em modo avião ainda precisam de validação no seu iPhone 11 e nos seus WAVs antes de uma cerimônia. Não é possível garantir risco zero de interrupção em PWA.
