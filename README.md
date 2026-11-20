# Loops Marks Pro — V2

Central de loops de bateria e percussão para cerimônias, com **Central Administrativa (computador)** e **Modo Live (celular)**. Projeto web instalável (PWA) para GitHub + Netlify, com catálogo e autenticação opcionais por Supabase. A V2 é um **pacote separado da V1**; não altere o ZIP antigo.

## O que foi incorporado na V2

- **Central Administrativa setorizada**: identificação, loops principais, viradas automáticas, viradas manuais, viradas específicas, encerramentos e mapa de transições. Cadastro automático no aparelho; sincronização pelo Supabase quando configurado.
- **Partes**: Introdução (uma vez), Parte A, Parte B, Parte C, Pré-refrão, Refrão, Parte baixa e Parte alta (loops independentes, quantizados).
- **Viradas automáticas**: uma por destino, com substituição opcional por regras específicas de origem → destino.
- **Viradas manuais**: Leve, Forte e Especial; uma virada pode tocar e retornar ao mesmo loop ou ser vinculada à próxima parte antes de a troca começar.
- **Viradas específicas ilimitadas por música**: adicione novas viradas com o nome escolhido e associe-as às passagens desejadas. As viradas não aparecem como botões extras no Modo Live, preservando a interface compacta.
- **Final e Acabamento** separados; comando de encerramento tem prioridade sobre pedidos de partes não iniciados. Botão de interrupção imediata permanece disponível.
- **Fila de trocas**: a transição é calculada em função do BPM e do compasso. Viradas podem ter qualquer número inteiro de tempos; o áudio seguinte começa sempre no tempo 1. O comando de cancelar só fica ativo até a entrada da virada.
- **Importação em lote**: o app sugere automaticamente a parte pelo nome do WAV, mas apresenta uma confirmação de cada destino antes de salvar. Também é possível importar individualmente.
- **Gerar link do aplicativo**: na administração, abre o endereço de `?modo=ao-vivo`, com opções de copiar ou compartilhar. O login não é dispensado pelo link.
- **Modo Live compacto**: só mostra as partes, viradas manuais e finais realmente cadastrados. A sessão de login é lembrada no aparelho, com ressalvas de expiração/revogação.
- **Offline**: os arquivos são baixados para armazenamento privado do aplicativo no celular (IndexedDB); não vão automaticamente para uma pasta visível no app Arquivos do iPhone. Repetição e transição usam áudio pré-carregado, sem buscar WAV pela rede durante a reprodução.
- **Compatibilidade V1**: arquivos antigos de Parte A, Parte B, Refrão, Introdução, viradas e Final continuam reconhecidos. Campos novos são opcionais. O banco SQL e as regras de acesso são os mesmos da V1.

## 1. Experimentar antes de publicar

É possível abrir localmente em um servidor HTTP, com Node ou Python:

```bash
python3 -m http.server 8080 --directory dist
```

Abra `http://localhost:8080/?modo=central` (administração) ou `http://localhost:8080/?modo=ao-vivo` (player). Sem configurar o Supabase, abre em **modo demonstração local** com três músicas sintetizadas na hora. Você pode cadastrar e testar WAVs nesse navegador, mas nada será sincronizado com outros aparelhos. O link de `localhost` **não funciona em outro celular**.

## 2. Publicação real: GitHub + Netlify + Supabase

1. Crie um projeto Supabase para o Loops Marks Pro. No **SQL Editor**, execute `supabase/setup.sql`. Isso cria a tabela de músicas e o bucket privado de áudio com políticas por usuário.
2. Em **Supabase → Authentication → Users**, crie a conta do administrador com **e-mail e senha**. Você poderá usar a mesma conta em computador e celular. Para uso particular, desative novos cadastros públicos.
3. Crie um repositório GitHub para esta pasta. No Netlify, importe o repositório. O `netlify.toml` já prepara a publicação da pasta `dist` e a geração da configuração pública.
4. Em **Netlify → Environment variables**, crie `LOOPS_SUPABASE_URL` e `LOOPS_SUPABASE_PUBLIC_KEY` (chave `publishable` ou `anon` do Supabase, **nunca** chave `service_role` ou `sb_secret_`). Publique novamente.
5. Entre pelo computador, abra a **Central Administrativa**, cadastre músicas e aguarde **Salvo na central**. Enquanto houver indicação de sincronização pendente, não conte com esse material disponível em outro aparelho.
6. Na Central Administrativa, use **Gerar link**. Compartilhe a URL gerada para `?modo=ao-vivo`. No iPhone, abra-a no Safari, **Compartilhar → Adicionar à Tela de Início**. Acesse com o mesmo e-mail/senha no primeiro acesso.
7. Em cada música, toque **Baixar para offline** e aguarde ficar **Pronto para tocar**. Se alterou os WAVs no computador, toque **Atualizar offline** no celular antes de tocar.

A sessão costuma persistir após fechar e abrir o aplicativo, mas pode ser invalidada por revogação, expiração ou limpeza do navegador. A conta e os dados cadastrados na nuvem não são compartilhados apenas por conhecer o link: cada aparelho precisa autenticar-se.

## 3. Como exportar WAVs da DAW

- Exporte a **mesma música** no mesmo BPM original e compasso. Prefira WAV PCM 16/24 bits; mono ou estéreo. Limite de **32 MB por arquivo**.
- Recorte cada **loop principal** com um ou mais **compassos completos**, incluindo exatamente as batidas que vão se repetir, sem silêncio extra. Não é necessário renderizar a música inteira.
- Exporte cada **virada** de forma independente. A V2 reconhece viradas de **1, 2, 3, 4 ou mais tempos inteiros**. Ex.: 4/4 a 80 BPM → 1 tempo = 0,75 segundo; 2 tempos = 1,5 segundo; 1 compasso = 3 segundos.
- A virada automática termina **no próximo tempo 1** da parte escolhida. Se for de 2 tempos, ela ocupa os tempos 3 e 4 anteriores a esse tempo 1. Se for de 1 compasso, começa no tempo 1 do compasso anterior.
- Os arquivos **Final** e **Acabamento** podem incluir uma cauda de pratos ou reverberação e são executados uma única vez.
- Exemplos de nome: `01_Introducao.wav`, `02_Parte_A.wav`, `03_Parte_B.wav`, `04_Pre_Refrao.wav`, `05_Refrao.wav`, `06_Virada_Leve.wav`, `07_Virada_para_Refrao.wav`, `08_Acabamento_Curto.wav`, `09_Final.wav`.
- Após **Importar vários WAVs**, revise os destinos sugeridos. Nomes ambíguos não são automaticamente assumidos como corretos.
- **Mapa de transições**: selecione, por exemplo, `De: Parte A`, `Para: Refrão`, `Usar virada: Virada específica X`, e salve. Sem regra, o player procura a virada automática do destino. A opção `Sem virada` desativa a virada naquela passagem.

## 4. Durante a cerimônia

- Em **Modo Live**, abra a música, ajuste o BPM **antes de Iniciar**, aguarde **Pronto para tocar** e inicie.
- Ao tocar em **Refrão**, por exemplo, o app agenda a virada cadastrada e o Refrão no tempo 1.
- Ao tocar em **Virada leve** sem ter outra parte agendada, ela é executada e o loop atual recomeça alinhado ao compasso. Ao tocar **Parte B** antes do início da virada, ela pode conduzir à Parte B.
- **Cancelar troca agendada** funciona enquanto a virada ainda não começou. **Acabamento** e **Final** podem substituir um pedido pendente de parte; durante uma virada já iniciada, o encerramento é encaixado no próximo tempo 1 possível.
- **Parar** interrompe imediatamente (emergência), diferentemente dos finais musicais.

## 5. Cuidados importantes antes de tocar ao vivo

A Web Audio API e o pré-carregamento eliminam a necessidade de baixar arquivos durante uma música, mas **nenhum aplicativo web pode prometer zero travamentos em qualquer aparelho**. Faça ensaio completo **em modo avião**, com todos os WAVs já baixados, a mesma interface de áudio/cabo da apresentação e o aplicativo em primeiro plano. Mantenha o aparelho carregado e desative bloqueios ou interrupções capazes de suspender o áudio. Se o sistema limpar o armazenamento local, poderá ser necessário baixar os WAVs outra vez.

Use os arquivos originais da DAW como backup. O Supabase mantém o catálogo e a cópia sincronizada dos WAVs quando a configuração e a sincronização estiverem completas.

## 6. Diagnóstico e testes

```bash
node --test tests/*.test.mjs
node scripts/configure.mjs
```

Os testes automatizados cobrem o modelo V2, a sugestão de nomes, o alinhamento das filas, a substituição de viradas e os encerramentos. Eles não substituem o teste de áudio no iPhone com arquivos e equipamento reais.

**Importante:** não existe servidor, usuário Supabase ou domínio Netlify criado automaticamente por este ZIP. A publicação, a configuração das chaves públicas e o primeiro login ainda devem ser feitos por você.
