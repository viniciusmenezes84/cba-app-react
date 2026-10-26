import { fireEvent, render, screen } from '@testing-library/react';
import AdminDashboardBridge from './AdminDashboardBridge';

test('o painel publicado permite escolher módulos por nome no celular', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { email: 'admin@cba.test', token: 'sessao-de-teste', role: 'ADMIN' }
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn(() => new Promise(() => {}));
  const onClose = jest.fn();

  try {
    render(<AdminDashboardBridge open onClose={onClose} />);
    const dialog = await screen.findByRole('dialog', { name: 'Administração' });
    expect(dialog).toBeInTheDocument();
    const moduleSelect = screen.getByRole('combobox', { name: 'Área da administração' });
    expect(moduleSelect).toHaveValue('resumo');
    fireEvent.change(moduleSelect, { target: { value: 'financeiro' } });
    expect(moduleSelect).toHaveValue('financeiro');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar administração' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});

test('item Documentos e impressões permanece alinhado à esquerda mesmo com duas linhas', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { email: 'admin@cba.test', token: 'sessao-de-teste', role: 'ADMIN' }
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn(() => new Promise(() => {}));
  try {
    render(<AdminDashboardBridge open />);
    const documents = await screen.findByRole('button', { name: 'Documentos e impressões' });
    expect(documents).toHaveClass('text-left');
    expect(documents.querySelector('svg')).toHaveClass('shrink-0');
    expect(documents.querySelector('span')).toHaveClass('min-w-0', 'flex-1', 'text-left');
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});

test('SUPER_ADMIN proprietário vê monitoramento, ADM comum não vê a área exclusiva', async () => {
  const previousFetch = global.fetch;
  global.fetch = jest.fn(() => new Promise(() => {}));
  try {
    window.localStorage.setItem('cba_session_v1', JSON.stringify({
      user:{email:'vinicius.m84@gmail.com',token:'sessao-super',role:'SUPER_ADMIN'}
    }));
    const {unmount}=render(<AdminDashboardBridge open />);
    expect(await screen.findByRole('button',{name:'Monitoramento de acessos'})).toBeInTheDocument();
    unmount();
    window.localStorage.setItem('cba_session_v1', JSON.stringify({
      user:{email:'soulucaspportugal1985@gmail.com',token:'sessao-admin',role:'ADMIN'}
    }));
    render(<AdminDashboardBridge open />);
    expect(screen.queryByRole('button',{name:'Monitoramento de acessos'})).not.toBeInTheDocument();
  } finally {
    global.fetch=previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});

test.each([
  ['SUPER_ADMIN', 'vinicius.m84@gmail.com'],
  ['ADMIN', 'soulucaspportugal1985@gmail.com'],
])('o cadastro de atletas mostra SUPER_ADMIN corretamente sem permitir troca pelo perfil %s', async (role, email) => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { email, token: 'sessao-teste-perfil-protegido', role }
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async (_, options) => {
    const {action}=JSON.parse(options.body);
    if(action!=='bootstrap') throw new Error('Requisição não prevista: '+action);
    return { ok:true,json:async()=>({result:'success',data:{
      athletes:[
        {id:'athlete-owner',name:'Vinicius',active:true,eligible_for_hof:true},
        {id:'athlete-member',name:'Outro Atleta',active:true,eligible_for_hof:true}
      ],
      accounts:[
        {id:'owner-account',athlete_id:'athlete-owner',email:'vinicius.m84@gmail.com',role:'SUPER_ADMIN',status:'approved'},
        {id:'member-account',athlete_id:'athlete-member',email:'member@cba.test',role:'MEMBER',status:'approved'}
      ],
      overview:{},audit:[]
    }}) };
  });
  try {
    const {unmount}=render(<AdminDashboardBridge open />);
    const navigation=await screen.findByRole('combobox',{name:'Área da administração'});
    fireEvent.change(navigation,{target:{value:'atletas'}});
    fireEvent.click(await screen.findByRole('button',{name:/Vinicius/}));
    const ownerRole=await screen.findByRole('textbox',{name:'Perfil de acesso'});
    expect(ownerRole).toHaveValue('Super Administrador');
    expect(ownerRole).toHaveAttribute('readonly');
    expect(screen.getByText(/Perfil exclusivo e protegido/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox',{name:'Perfil de acesso'})).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox',{name:'Liberar acesso'})).toBeDisabled();
    unmount();
  } finally {
    global.fetch=previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});

test('cadastro de membro continua oferecendo somente Membro e Administrador', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user:{email:'soulucaspportugal1985@gmail.com',token:'sessao-test',role:'ADMIN'}
  }));
  const previousFetch=global.fetch;
  global.fetch=jest.fn(async()=>({ok:true,json:async()=>({result:'success',data:{
    athletes:[{id:'athlete-member',name:'Jogador Comum',active:true}],
    accounts:[{athlete_id:'athlete-member',email:'membro@cba.test',role:'MEMBER',status:'approved'}],
    overview:{},audit:[]
  }})}));
  try {
    render(<AdminDashboardBridge open/>);
    fireEvent.change(await screen.findByRole('combobox',{name:'Área da administração'}),{target:{value:'atletas'}});
    fireEvent.click(await screen.findByRole('button',{name:/Jogador Comum/}));
    const roleField=await screen.findByRole('combobox',{name:'Perfil de acesso'});
    expect(roleField).toHaveValue('MEMBER');
    expect(roleField).not.toBeDisabled();
    expect(roleField.querySelectorAll('option')).toHaveLength(2);
    expect(Array.from(roleField.options).map(o=>o.value)).toEqual(['MEMBER','ADMIN']);
  } finally {
    global.fetch=previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});
