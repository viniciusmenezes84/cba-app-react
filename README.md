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

No Início, toque na foto ou no nome para abrir o perfil pessoal. É possível editar apelido, posição, camisa preferida e foto por link HTTPS; o nome cadastrado é preservado. A tela mostra a temporada, frequência e histórico de presença, com acesso ao card e à agenda. As ações `getMyProfile` e `updateMyProfile` usam exclusivamente o atleta vinculado à sessão validada no servidor. A migração `20261009173459_athlete_nickname.sql` deve ser aplicada antes de publicar a nova `cba-portal`. Verificação das permissões: `npm run test:profile`.

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
