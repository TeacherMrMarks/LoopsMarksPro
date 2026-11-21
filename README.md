# Loops Marks Pro — V15

Atualização incremental construída a partir da **V14**, preservando a paleta de cores e a configuração atual do Netlify, banco, links de músicos e autenticação.

## Alterações V15

- **Lateral padronizada:** Gerenciamento, Modo ao vivo e Configurações têm o mesmo padrão visual de borda, preenchimento, tipografia e ícones. Os submenus não mudam.
- **Sincronização discreta:** indicador de estado foi removido da lateral da Central Administrativa e colocado no canto direito do cabeçalho de cada página. O processo de sincronização não mudou. No Modo Live o indicador permanece no topo, como antes.
- **Abas do editor reorganizadas:** Dados | Loops | **Loop + Crash** | **Crash** | Viradas | Mapa musical | Finais. A aba *Loop + Crash* contém os WAVs já existentes de entrada na parte, tocados uma vez e seguidos do loop contínuo.
- **Novo Crash de parada:** a nova aba **Crash** permite cadastrar até 3 WAVs distintos para um ataque isolado **bumbo + prato** com cauda prolongada, em músicas e ritmos. Os novos arquivos são independentes dos loops com crash, das viradas e dos acabamentos existentes.
- **Modo Live:** se o cadastro tem algum desses 3 WAVs, aparecem botões na nova seção **Crash**. Ao tocar, o motor agenda o ataque para o próximo início de compasso, interrompe o loop anterior sem virada e deixa o WAV soar **até o fim da cauda natural**, encerrando a execução. Os mesmos comandos estão disponíveis para mapeamento de pedal Bluetooth HID. O arquivo nunca fica em repetição.
- **Nomes sugeridos para importação em lote:** `Crash_Final.wav` (Crash 1), `Crash_Final_2.wav` (Crash 2), `Crash_Final_3.wav` (Crash 3), sem modificar a associação existente de `Parte_A_com_crash.wav` (entrada com crash).
- **Mapa musical:** se desejar, os ataques Crash já cadastrados também podem ser usados como etapa de encerramento de uma música.
- **Backup:** o ZIP completo continua incluindo todos os `song.parts` e WAVs, portanto inclui também Crash 1, 2 e 3 sem migração de dados ou alteração de estrutura de armazenamento.

## Como testar

1. Faça um backup da V14 e mantenha uma cópia do ZIP anterior.
2. Extraia o pacote V15 e atualize a raiz do mesmo GitHub, mantendo as configurações de build (`npm run build`, publicação `dist`, funções `netlify/functions`).
3. Abra o Permalink do deploy de teste antes de promover para produção.
4. Crie um ritmo com Parte A contínua e `Crash_Final.wav` na aba Crash. Confira que tocar no botão **Crash 1** durante o loop não reproduz virada e termina após a cauda inteira do WAV.
5. Teste separadamente a aba **Loop + Crash** (entrada na seção que continua no loop) e a aba **Crash** (parada final isolada).
6. Confira a sincronização discreta no cabeçalho e o alinhamento dos botões externos na lateral.
7. Antes do uso no palco, teste os arquivos WAV reais no iPhone e em Modo Avião.

**Segurança e compatibilidade:** Netlify Functions, Netlify Identity, Netlify Blobs, stores, URLs do músico e mecanismos de backup/restauração não foram modificados. O novo slot Crash usa a mesma persistência de WAV que todos os demais. Não altere variáveis ou configurações do Netlify.

## Testes

Execute `npm test` para validar regressões e a lógica de Crash. Testes locais não substituem o teste real com WAV e Bluetooth no aparelho do músico.
