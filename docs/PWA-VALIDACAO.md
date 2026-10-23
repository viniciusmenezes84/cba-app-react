# Portal CBA — Instalação PWA e homologação

## Objetivo
Permitir que os atletas adicionem o Portal CBA à tela inicial sem Play Store ou App Store. O portal continua sendo React + Vercel + Supabase: não é aplicativo nativo. Este PR não altera o backend, as permissões nem o banco.

## Instalação
- **Android / Chrome:** abrir a URL HTTPS do CBA → menu ⋮ → **Instalar app** ou **Adicionar à tela inicial** → confirmar.
- **iPhone / Safari:** abrir a URL HTTPS → **Compartilhar** → **Adicionar à Tela de Início** → marcar **Abrir como App da Web** (quando disponível) → adicionar.
- A opção **Instalar Portal CBA** no menu lateral orienta o atleta. Em navegadores Chromium elegíveis, o botão dispara o prompt nativo por interação do usuário.

## Checklist manual — testar antes de integrar à main
- [ ] Chrome Android: adicionar/instalar e abrir ícone em janela própria sem barra de URL.
- [ ] Safari iOS: adicionar ao início; abrir como app e confirmar ícone do CBA.
- [ ] Confirmar login, sair e reabrir; permissões MEMBER / ADMIN inalteradas.
- [ ] Alternar Início, Presença, Meu CBA, Jogos e, como ADM, Mesário.
- [ ] Publicar nova versão na **prévia** (sem afetar produção), reabrir e verificar atualização.
- [ ] Com o app aberto, nova versão deve mostrar **Atualizar agora**; não recarregar uma súmula no meio do preenchimento.
- [ ] Desligar rede, reabrir PWA → mensagem offline sem estatísticas ou informações privadas.
- [ ] Reconectar → botão **Tentar novamente** restaura o portal online.
- [ ] DevTools Application > Cache Storage: somente offline.html, ícone institucional e recursos `/static/js` ou `/static/css` com hash.
- [ ] Conferir que respostas de Supabase, login, sessões, fotografias pessoais e endpoints API não foram armazenados em Cache Storage.
- [ ] Conferir rolagem, viewport e barra inferior em 320px, 390px e tablets.

## Política de atualização e segurança
- O service worker `public/service-worker.js` usa **network-first sem cache de HTML** e apenas recursos de build com nomes versionados no cache estático.
- Nada do backend é servido offline; offline.html é um aviso genérico.
- O service worker aguarda autorização do usuário para ativar a nova versão; o botão **Atualizar agora** envia SKIP_WAITING e recarrega após controllerchange.
- O app registra o worker somente em build de produção; testes locais (`npm start`) não registram.
- A Vercel marca o service-worker.js, manifest e HTML como `no-cache` para permitir detectar versões novas.
- Não instalar ou testar com usuários reais na URL da branch antes de confirmar que a prévia aponta para um ambiente de dados adequado; o ambiente Vercel Preview pode compartilhar o backend de produção dependendo das variáveis configuradas.

## Acompanhamento
Responsáveis por validação funcional: proprietário do CBA e @LucasPortugal1985.
O deploy automático da Vercel no PR é de **prévia**, não promoção à produção.
