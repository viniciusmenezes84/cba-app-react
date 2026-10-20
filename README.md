## Relatório executivo esportivo em cards (0.4.21)

A emissão exclusiva do ADM na aba Início mantém o fluxo de validação administrativa introduzido na 0.4.20 e gera o PDF com o mesmo objeto \`buildHomeHighlights\` dos cards do Sports Center. A evolução visual usa seis páginas A4, identidade navy/verde/índigo/dourado e rodapé numerado: capa com quatro indicadores, radar de destaques da última rodada, líderes da temporada em cards, cinco rankings Top 5 com barras de comparação, recordes em colunas **por rodada / por partida** e gráficos de presença/evolução do cestinha (últimas oito rodadas).

O documento usa círculos com iniciais (sem buscar fotos externas) para manter previsibilidade na geração offline e evitar imagens vazias/bloqueadas. Nenhum número é fabricado: resultados sem súmula mostram \`Sem registro\`; recordes por partida exigem identificador individual. Índice de destaque editorial = PTS + REB + AST + TOC, não MVP oficial. Tentativas de arremesso não são capturadas, então não há percentual de aproveitamento. A geração continua no navegador via jsPDF; não há mudanças em banco, funções ou permissões.

# Portal CBA

Portal de jogos, presença, desempenho e administração do Clube Basquete dos Aposentados.

## Desenvolvimento

Use Node 24 e instale as dependências do `package.json`:

```bash
npm install
npm start
```

`npm start` gera automaticamente o CSS do Tailwind antes de iniciar o React. `npm run build` executa a mesma etapa. O arquivo gerado (`src/tailwind.generated.css`) é ignorado pelo Git; edite `src/tailwind.source.css` para alterar o processamento de estilos.

```bash
CI=true npm test -- --watch=false --runInBand
npm run build
```

## Meu CBA (0.4.12)

Toque em Meu CBA no cabeçalho de qualquer aba, no celular ou computador, para abrir o perfil pessoal. O cartão de saudação no Início também abre o perfil. É possível editar apelido, posição e camisa preferida; a foto é enviada pelo botão Alterar foto; o nome cadastrado é preservado. A tela mostra a temporada, frequência e histórico de presença, com acesso ao card e à agenda. As ações `getMyProfile` e `updateMyProfile` usam exclusivamente o atleta vinculado à sessão validada no servidor. A migração `20261009173459_athlete_nickname.sql` deve ser aplicada antes de publicar a nova `cba-portal`. Verificação das permissões: `npm run test:profile`.

## Compartilhar minha rodada

No Meu CBA, selecione a temporada e acesse Minhas rodadas. As datas com súmula do próprio atleta aparecem da mais recente para a mais antiga. Toque em Compartilhar minha rodada para conferir a prévia em Post (1080 × 1350) ou Story (1080 × 1920), compartilhar o PNG pelo seletor do aparelho, baixar a imagem ou copiar a legenda. O atleta escolhe o aplicativo e conclui a publicação.

Os cards reutilizam os dados autorizados de `getMyProfile`, sem consulta adicional. Pontos seguem `pts2 * 2 + pts3 * 3`; os totais são consolidados por data e podem reunir várias partidas. Súmulas zeradas continuam disponíveis; presença sem súmula não gera card. Campos não registrados aparecem como `—`. A foto precisa carregar ou ser substituída pela inicial antes da exportação; as proteções CORS do card da temporada são preservadas. Se o navegador não compartilhar arquivos, Baixar PNG continua disponível, e a legenda permanece visível para cópia manual.

Para testar localmente: execute `npm start`, entre com uma conta vinculada a atleta, abra Meu CBA e escolha uma rodada com súmula. Confira os dois formatos, o download, a legenda e, em aparelho compatível, o compartilhamento nativo. Verificação automatizada: `npm test -- --watch=false --runInBand` e `npm run build`.

## Conquistas do atleta (0.4.14)

No Meu CBA, a seção Minhas conquistas calcula seis marcos por temporada: primeira presença, 100 pontos, 50 rebotes, 50 assistências, 20 presenças e 25 presenças. Mostra progresso, próximo objetivo e regras em uma área expansível. O card pessoal leva uma conquista sobre a área da foto, nos formatos Post e Story. O destaque prioriza 25 presenças, 20 presenças, assistências, rebotes, pontos e primeira presença.

Os cálculos reutilizam a resposta do perfil pessoal e respeitam a temporada selecionada; não criam consultas, tabelas ou prêmios persistidos. Somente status `present` conta como presença; pontos seguem `pts2 * 2 + pts3 * 3`. Registros corrigidos recalculam os marcos ao recarregar. Sem registros, a tela informa que aguarda presenças/súmulas. Esta versão usa totais pessoais; sequências de domingos e liderança de rodada ficam para uma etapa posterior.

## Foto de perfil (0.4.15)

Cada atleta pode usar Meu CBA → Alterar foto → Escolher foto (ou Tirar foto no celular), ajustar zoom e posição, conferir a prévia e salvar. JPG, PNG, WebP, HEIC e HEIF até 15 MB são aceitos. A conversão HEIC é carregada somente se o navegador não conseguir abrir a foto nativamente; formatos HEIC específicos ainda podem exigir exportação para JPG. O resultado é JPEG quadrado de 768 px, comprimido no navegador, com validação e remoção de metadados no servidor. Progresso, erro e nova tentativa ficam visíveis; remover exige confirmação. O card aguarda a foto antes de liberar download; se ela demorar, o jogador pode escolher continuar com a inicial ou tentar carregar novamente. A imagem compartilhada acompanha a prévia quando a foto chega depois.

O bucket público `profile-photos` permite exibição e exportação do card; não há políticas de escrita para `anon` ou `authenticated`. `cba-portal` valida a sessão própria, a aprovação da conta e o vínculo com o atleta em `uploadMyPhoto` e `removeMyPhoto`. O cliente nunca define atleta ou caminho. A foto antiga é removida somente após salvar a nova referência, com compare-and-set para evitar sobrescrita concorrente. Falhas no banco descartam o novo objeto. Falhas excepcionais na limpeza podem deixar um objeto sem referência e são registradas como `photo_cleanup_failed`.

Aplique `20261013112614_profile_photos_storage.sql` antes de implantar a função. Verificação: `npm run test:photo` e `npm run test:profile`. O servidor limita o corpo a 2 MB, aceita somente JPEGs válidos e quadrados de 64–768 px, e o bucket limita cada arquivo a 1 MB. `heic-to` e `jpeg-js` têm versões fixas; o lockfile está versionado.

## Modo Quadra (0.4.16)

No Mesário, inicie a partida e toque em Modo Quadra. A mesa ocupa a área do portal, recolhendo cabeçalho, menu e navegação inferior. Sair do Modo Quadra (ou Escape, no computador) restaura a navegação sem apagar os lançamentos. Confirmar o fim da partida também restaura o portal. Não depende da API de tela cheia do navegador, funcionando no app instalado e no Safari móvel.

O placar permanece visível, fotos têm fallback para a inicial e ações exibem confirmação e a última jogada. A mesa usa a largura disponível: a partir de 840 px mostra os dois times; abaixo disso mostra um seletor de equipe e expande os controles do atleta selecionado. A partir de 980 px os atletas ficam em linhas compactas. O Modo Quadra mantém os controles fora da rolagem da lista; listas extensas continuam roláveis. Corrigir lançamento abre botões de subtração; Desfazer reverte a última ação. Histórico e resumo ficam numa área expansível. Backup local, regras de pontuação, confirmação do resultado e salvamento da súmula continuam no fluxo existente; o modo visual não é persistido no backup.

## Relatório executivo esportivo no Início (0.4.20)

O ADM pode emitir um relatório A4/PDF na seção **CBA Sports Center** da aba **Início** selecionando a temporada e clicando em **Relatório executivo PDF**. O documento utiliza os mesmos seletores dos cards da tela (\`buildHomeHighlights\`) e o estilo institucional dos relatórios já existentes: capa navy, cabeçalhos, quadros de resumo, tabelas e numeração de páginas. Inclui destaque da última rodada com súmula, líderes do ano, assiduidade, ranking Top 5 de PTS/REB/AST/TOC/3PT, recordes por rodada e por partida individual, evolução do cestinha e presença recente. Disponibiliza ações **Visualizar PDF** e **Baixar PDF**.

Apenas a interface de ADM exibe o comando, e o backend \`cba-admin\` confirma a sessão ADMIN e registra \`admin_issue_sports_report\` na auditoria **antes** de liberar a emissão pelo fluxo oficial. O PDF é criado no navegador com \`jspdf\`/\`jspdf-autotable\` usando os dados já carregados, sem novo endpoint público de estatísticas. Não salva PDF no servidor e não altera banco. Recordes de partidas são apresentados somente quando as partidas individuais existem. Estatísticas legadas são interpretadas como rodadas por data; não simular aproveitamento sem tentativas de arremesso.

## Destaques esportivos no Início (0.4.18)

A página **Início** preserva saudação/Meu CBA, agenda, próximos jogos/eventos, situação financeira e comunicação. A seção **CBA Sports Center** acrescenta destaques da última rodada com súmula, líderes e ranking da temporada selecionada (PTS, REB, AST, TOC e 3PT), assiduidade, evolução individual (produção ou posição acumulada), presenças por data, sequência de comparecimentos e recordes.

Os indicadores reutilizam o `dashboard.players` do `InitialDataContext` e `roundMatches` do `cba-portal/bootstrap`, sem novas consultas. A temporada é determinada pelo ano da data; resultados de um mesmo domingo permanecem consolidados na rodada; recordes por **partida** são exibidos apenas quando existem partidas detalhadas persistidas. Dados zerados não elegem falsos líderes.

**Importante:** a indicação de destaque usa índice editorial transparente `PTS + REB + AST + TOC`; não é prêmio MVP oficial nem eficiência técnica completa. Sem tentativas de arremesso, não é possível calcular aproveitamento de arremessos. Ranking e evolução por rodada respeitam ano e data. Para testar: `CI=true npm test -- --watch=false --runInBand`; para compilar: `CI=false npm run build`.

## Organização atual

- `src/App.js`: autenticação, navegação e telas principais. O acesso à Administração faz parte da navegação do aplicativo.
- `src/HomeDashboard.js`: Início renderizado diretamente no React, com atalhos de navegação e consulta ao `cba-portal` cancelável e atualizável; a situação financeira mostra apenas a conta vinculada.
- `src/AgendaView.js` e `src/agendaCalendar.js`: Minha Agenda reúne jogos e eventos futuros dentro do Início, filtra confirmações e gera compromissos `.ics` ou links para o Google Agenda; não adiciona uma aba ao menu lateral.
- `src/ScheduleDashboard.js` e `src/PortalExperienceBridge.js`: Jogos e Eventos são abertos diretamente no React, com resumo, próximo compromisso, histórico e resposta visível ao confirmar participação; o restante do portal ainda usa a ponte de experiência.
- `src/roundRecap.js`, `src/roundRecapCanvas.js` e `src/RoundRecapModal.js`: no histórico de Jogos com súmula, o Resumo da Rodada combina as estatísticas por data e os placares individuais que o mesário registrou, gerando imagens para post ou Story, sem adicionar outra aba. A súmula anterior à implantação não possui placares recuperáveis; esses cards exibem só os dados consolidados e identificam que podem incluir várias partidas.
- `src/CbaHistory.js`: memória do CBA aberta dentro do Hall da Fama, com os criadores, o reencontro, os domingos no Resgate e o episódio que inspirou a marca. O texto editorial pode ser ampliado com fotos e relatos posteriormente, sem criar outra aba no menu.
- `src/AdminDashboardBridge.js`: painel administrativo usado diretamente pelo aplicativo e pelos testes.
- `src/InitialDataContext.js`: dados iniciais compartilhados com o painel de Presença. Novos painéis devem reutilizá-los antes de iniciar outra consulta.
- `src/cbaApi.js`: cliente único das funções Supabase. Lê a sessão local e envia o token de acesso às funções `cba-gateway`, `cba-admin`, `cba-portal` e `cba-medical` diretamente.
- `src/athleteCardCanvas.js` e `src/AthleteCardModal.js`: card para post e Stories, com download e compartilhamento nativo quando disponível.
- `src/SorteioDashboard.js`: painel de Sorteio renderizado diretamente pela aba e alimentado pelos dados iniciais já carregados, sem observador de DOM ou consulta duplicada.
- `src/DmDashboard.js`: painel médico renderizado diretamente pela aba. Consulta `cba-medical` separadamente para receber os registros e permissões filtrados no servidor; também salva ocorrências e registra altas por essa função.
- `src/ReportsDashboard.js`, `src/ReportsStatsByDate.js`, `src/ReportsRankingCompact.js` e `src/ReportsPdf.js`: aba de Relatórios renderizada diretamente no React com um filtro de temporada e atleta, súmulas por data, ranking e PDFs anual e mensal. Os PDFs são montados diretamente a partir dos dados, sem captura de HTML ou dependência de CDN; após a geração, o usuário toca no link para abrir ou baixar. O relatório anual consulta o status operacional do Departamento Médico na geração.
- `src/MesarioDashboard.js`: painel do Mesário renderizado diretamente pela aba, com recuperação dos backups antigos e atuais, ações de súmula via gateway, gravação idempotente dos resultados individuais e atualização dos dados após salvar.
- `src/tailwind.source.css` e `scripts/build-tailwind.js`: classes CSS produzidas durante a compilação, sem depender do CDN no navegador.

## Backend e segurança

As funções Supabase `cba-gateway`, `cba-portal`, `cba-admin` e `cba-medical` são chamadas diretamente pelo frontend. Seus fontes, junto com a função interna `cba-api`, estão em `supabase/functions`; a configuração atual de autenticação das funções está em `supabase/config.toml`. A migração da tabela `round_matches` está em `supabase/migrations`; o restante do esquema e das políticas existentes ainda não está versionado neste repositório. O papel salvo no navegador serve para mostrar os controles; **cada ação administrativa precisa validar token e papel no servidor**. O logout chama `logoutUser` para revogar a sessão antes de apagar o token local; se o servidor não responder, o app avisa o usuário. As permissões `TRUNCATE` de `anon` e `authenticated` foram revogadas das tabelas públicas no projeto Supabase, inclusive dos privilégios padrão do papel `postgres`. Não coloque chaves de serviço no cliente.

O login consulta apenas a senha armazenada no Supabase. A `cba-api` não consulta mais o Apps Script quando a conta não tem senha local. As funções usam tokens próprios em `app_sessions`, validados no servidor; a migração para Supabase Auth e RLS é uma etapa separada. Para uma implantação da `cba-api`, confirme que as contas aprovadas têm `legacy_password_hash` e que `legacy_auth_fallback_enabled` está desativado antes de atualizar a função. Outras funções ativas, como `legacy-api`, `cba-health` e `send-push-notification`, não fazem parte deste conjunto versionado.

O arquivo `public/service-worker.js` é legado e não é registrado pelo frontend. O aplicativo instalado exige conexão para consultar dados operacionais; uma estratégia de acesso offline deve tratar separadamente sessão e informações de atletas.
