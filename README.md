# LOOPS MARKS PRO — V4 TESTE SEM LOGIN

Esta é uma **prévia separada** da V4 oficial para testar a interface e o motor de loops sem e-mail, senha ou Netlify Identity. O código do motor V4 foi preservado. Não é uma versão de produção.

## O que dá para testar
- Abre diretamente em Modo Live e na Central Administrativa.
- Três músicas demonstrativas têm percussão sintetizada no navegador.
- Importa WAVs reais, salva músicas localmente (IndexedDB), permite Partes A/B/C, Pré-refrão, Refrão, partes alta/baixa, entradas com crash, viradas manuais, automáticas e variantes, encerramentos.
- Mantém seleção de BPM, transições inteligentes e repetição de seção.
- Exporta/restaura ZIP de backup completo, sem depender de npm ou internet após instalar offline.

## Limites deliberados do ambiente de teste
- **Sem login e sem servidor de dados:** não baixa sua biblioteca privada da nuvem e não grava em Netlify Blobs.
- Cadastros feitos num aparelho **não aparecem no outro**. Para transferir, use Backup completo na Central e restaure o ZIP no segundo aparelho.
- A biblioteca e os WAVs locais ficam no armazenamento privado do navegador. Faça backup externo. Se você publicar este site, qualquer visitante com o link poderá acessar a demonstração (mas não sua biblioteca privada no Netlify).
- Se publicar num deploy de teste do mesmo projeto, mantenha **a publicação automática bloqueada**, para não substituir sua V3.2/V4 oficial no domínio principal.
- Não use para apresentar em cerimônia sem ensaios completos com o equipamento.

## Opção 1 — GitHub + Netlify (teste por Deploy Permalink)
1. Extraia o ZIP **GitHub** e envie o conteúdo extraído na raiz do repositório. Mantenha a publicação automática bloqueada se estiver testando no projeto principal.
2. Netlify: Base directory vazio; Build command `npm run build`; Publish directory `dist`; Functions directory vazio.
3. Depois do deploy, abra o **Permalink correspondente à V4 TESTE**. A tela abre sem login.
4. Não desbloqueie a publicação automática da versão de teste se não deseja publicá-la como produção.

## Opção 2 — Netlify Drop sem build (site separado)
1. Extraia o ZIP **Netlify Drop** (os arquivos do `dist` estão na raiz).
2. Abra https://app.netlify.com/drop e envie a pasta extraída (contém `index.html`).
3. O site de teste terá um endereço próprio, sem login.

## Backup
O backup gerado usa ZIP sem compressão (áudios preservados). A restauração desta prévia aceita esse formato e mostra uma mensagem clara se o ZIP utilizar compressão não suportada. Não confunda este backup com o backup da biblioteca oficial do Netlify.
