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
- `React`: visão geral de Finanças exclusiva de ADM; relatório e atleta fixos no `athleteId` quando MEMBER; home sem rankings gerais para MEMBER.
- Testes para API com tentativa de forjar a role e atleta da requisição; testes de restrições de relatório e da visão ADMIN.

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
