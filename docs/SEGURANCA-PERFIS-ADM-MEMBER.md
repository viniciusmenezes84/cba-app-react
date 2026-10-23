# CBA — Matriz de permissões e plano de homologação (23/10/2026)

## Contrato funcional
- **ADMIN:** acesso completo a todas as fichas, finanças, cobranças, presença, estatísticas, histórico esportivo, súmulas e gestão.
- **MEMBER:** somente a própria ficha, dados financeiros e histórico de pagamentos, presença, estatísticas individuais e histórico esportivo.
- **Compartilhado:** agenda de jogos/eventos, comunicados e documentos gerais do clube; **não** divulgar dados individuais alheios ou lista de devedores.

| Recurso | ADMIN | MEMBER |
| --- | --- | --- |
| Meu CBA / perfil / foto | Todos | Próprio |
| Finanças (caixa e balanço) | Completo | Negado |
| Mensalidades / histórico de pagamentos | Todos | Próprio |
| Estatísticas e presença por atleta | Todos | Próprio |
| Ranking geral e relatório executivo | Sim | Não |
| Súmula completa / Mesário | Sim | Não |
| Administração / criar, editar, excluir | Sim | Não |
| Agenda e comunicados institucionais | Sim | Sim |

## Evidências da auditoria
- Projeto Supabase cba-app: duas contas aprovadas, ambas ADMIN, nenhuma MEMBER aprovada durante esta auditoria.
- Endpoint `cba-api`: `getInitialAppData` usava um RPC de relatório completo e só restringia parcialmente o bloco `finance`.
- Endpoint `cba-portal`: `bootstrap` retornava `hall`, `roundMatches`, `athletes` e indicadores financeiros agregados a qualquer membro.
- O controle de ADMIN vinha do papel da conta no banco, porém o frontend podia mostrar cartões financeiros coletivos mesmo para MEMBER.
- RLS de `athletes`, `attendance_records`, `daily_stats` permite a contas PostgreSQL `authenticated` consultar todas as linhas quando `private.current_account_id()` não é nulo. O login atual é personalizado e trafega por Edge Functions com service_role. Esse conjunto deve ser revisto e endurecido antes de liberar clientes autenticados de Data API.

## Correções desta proposta
- `cba-api`: lista esportiva filtrada por `actor.athlete_id`; dados de caixa global fora da resposta MEMBER; datas históricas vinculadas ao próprio atleta; sessão inclui `athleteId`; confirmação alheia de próximo jogo removida.
- `cba-portal`: MEMBER só recebe seu cadastro, seus pagamentos, seu hall individual e seus dados de confirmação; sem `roundMatches` detalhadas, informações de saúde coletivas, caixa geral ou dados pessoais de outros jogadores.
- `React`: visão geral de Finanças exclusiva de ADM; relatório, atleta e presença fixos no `athleteId` quando MEMBER; home sem rankings gerais para MEMBER. O menu MEMBER não expõe Sorteio, Hall da Fama coletivo nem Mesário; tentativas de restaurar abas antigas são bloqueadas.
- `cba-api/getGames` e `getEvents`: listas de confirmados/inscritos de MEMBER filtradas por vínculo de `athlete_id` com jogo/evento, sem confiar na coincidência de nomes; ADM continua vendo todas as confirmações.
- Testes para API com tentativa de forjar a role e atleta da requisição; testes de restrições de relatórios, presença e rotas legadas Jogos/Eventos, além da visão completa do ADMIN.

## Homologação obrigatória antes do deploy
1. Criar ou habilitar **uma conta de testes MEMBER** vinculada a atleta de teste, **após autorização do proprietário**. Não converter ADM reais em MEMBER.
2. Com MEMBER, confirmar que só os próprios históricos, mensalidades, dados e relatórios aparecem. Verificar consultas diretas às Edge Functions (inclusive `getInitialAppData` e `bootstrap`) e ausência de atletas terceiros no JSON.
3. Confirmar impossibilidade de acesso a `cba-admin`, `getMatchStats` e mudanças de outros atletas (HTTP 403).
4. Com ADMIN, conferir relatórios completos, finanças de todos, Mesário, administração e sorteios intactos.
5. Fazer revisão específica de RLS e das permissões `EXECUTE` dos RPCs `*_compat` para papéis `anon` e `authenticated`. Requer plano de migração com testes de regressão; não usar mudanças de políticas improvisadas diretamente em produção.
6. Implantar as Edge Functions **cba-api** e **cba-portal** coordenadas com frontend; **merge no GitHub não publica automaticamente Supabase**.
7. Retestar em conta MEMBER real e no PWA Android/iOS após publicação.
8. Reautenticar perfis MEMBER com sessões antigas, se existirem, para receber `athleteId` no payload de login.

**Fora do escopo deste PR:** alteração do schema/RLS em produção, criação de contas e migração de registros.

## Aditivo — Painéis esportivos compartilhados (23/10/2026)
**Este aditivo substitui as restrições de visualização esportiva MEMBER descritas acima para as três abas listadas.**

| Recurso | ADMIN | MEMBER |
| --- | --- | --- |
| Início / CBA Sports Center, cards, recordes, rankings e temporadas | Visualização completa | **Mesma visualização** |
| Presença, cards, quórum, temporadas e comparativos coletivos | Visualização completa | **Mesma visualização** |
| Relatórios esportivos, rankings, dados por data e seleção de qualquer atleta/temporada | Visualização completa | **Mesma visualização, sem exportação** |
| Exportações de relatórios esportivos em PDF (inclusive o executivo no Início) | Permitidas mediante autorização | **Bloqueadas na interface** |
| Finanças, caixa, receitas, despesas e cobranças de terceiros | Integral | **Somente mensalidades e histórico próprios** |
| Meu CBA / edição do cadastro de terceiros / área administrativa / Mesário | Conforme perfil | **Somente Meu CBA pessoal** |

A API `getInitialAppData` compartilha apenas campos esportivos explicitamente autorizados dos atletas, sem liberar resumo financeiro global. No `cba-portal/bootstrap`, partidas e súmulas fornecem somente informações esportivas usadas pelos painéis; escalações detalhadas continuam restritas à administração. Confirmações individuais de terceiros não são expostas, apenas a contagem agregada na tela inicial. O indicador agregado de atletas em acompanhamento pode aparecer no Início sem revelar prontuários.

A edição de dados alheios, a emissão auditada de PDFs e os endpoints administrativos continuam exigindo ADMIN no servidor. A supressão do botão PDF no frontend atende à permissão de uso do portal, mas dados esportivos exibidos em tela continuam passíveis de captura manual (prints/cópias). A revisão das políticas RLS e a homologação com conta MEMBER real continuam pendentes e independentes desta alteração.
