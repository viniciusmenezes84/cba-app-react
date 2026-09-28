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

## Organização atual

- `src/App.js`: autenticação, navegação e telas principais. O acesso à Administração faz parte da navegação do aplicativo.
- `src/AdminDashboardBridge.js`: painel administrativo usado diretamente pelo aplicativo e pelos testes.
- `src/InitialDataContext.js`: dados iniciais compartilhados com os painéis de Presença, Relatórios e Mesário. Novos painéis devem reutilizá-los antes de iniciar outra consulta.
- `src/cbaApi.js`: cliente único das funções Supabase. Lê a sessão local e envia o token de acesso às funções `cba-gateway`, `cba-admin`, `cba-portal` e `cba-medical` diretamente.
- `src/athleteCardCanvas.js` e `src/AthleteCardModal.js`: card para post e Stories, com download e compartilhamento nativo quando disponível.
- `src/tailwind.source.css` e `scripts/build-tailwind.js`: classes CSS produzidas durante a compilação, sem depender do CDN no navegador.

## Backend e segurança

As funções Supabase `cba-gateway`, `cba-portal`, `cba-admin` e `cba-medical` são chamadas diretamente pelo frontend. Seus fontes e políticas do banco não estão neste repositório. O papel salvo no navegador serve para mostrar os controles; **cada ação administrativa precisa validar token e papel no servidor**. O logout chama `logoutUser` para revogar a sessão antes de apagar o token local; se o servidor não responder, o app avisa o usuário. As permissões `TRUNCATE` de `anon` e `authenticated` foram revogadas das tabelas públicas no projeto Supabase, inclusive dos privilégios padrão do papel `postgres`. Não coloque chaves de serviço no cliente.

O arquivo `public/service-worker.js` é legado e não é registrado pelo frontend. O aplicativo instalado exige conexão para consultar dados operacionais; uma estratégia de acesso offline deve tratar separadamente sessão e informações de atletas.
