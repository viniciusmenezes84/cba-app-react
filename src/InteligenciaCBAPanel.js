import React, {useCallback,useEffect,useMemo,useState} from 'react';
import {adminPost} from './cbaApi';
import {Activity,BarChart3,CalendarDays,CheckCircle2,ChevronDown,RefreshCw,ShieldCheck,TrendingUp,Users,Wallet} from 'lucide-react';

const money = value => Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const number = value => Number(value||0).toLocaleString('pt-BR');
const pct = (part,total) => total > 0 ? Math.round(part/total*100) : null;
const shortDate = value => value ? String(value).slice(8,10)+'/'+String(value).slice(5,7) : '—';
const monthLabel = value => new Date(String(value)+'-15T12:00:00').toLocaleDateString('pt-BR',{month:'short'}).replace('.','');
const TAB_NAMES = {
  inicio:'Início',presenca:'Presença',relatorios:'Relatórios',atleta:'Atleta',
  mesario:'Mesário',financas:'Finanças',jogos:'Jogos',eventos:'Eventos',
  sorteio:'Sorteio',dm:'Departamento Médico',halldafama:'Hall da Fama',
  estatuto:'Estatuto',notificacoes:'Notificações'
};
const tabs=[
  ['geral','Visão geral',TrendingUp],
  ['engajamento','Engajamento',Users],
  ['presenca','Presenças',CalendarDays],
  ['esporte','Esportivo',BarChart3],
  ['gestao','Gestão',Wallet]
];

function Panel({title,detail,children}) {
  return <section className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-4 md:p-5">
    {title && <div className="mb-4"><h3 className="text-base font-black text-slate-100">{title}</h3>{detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}</div>}
    {children}
  </section>;
}
function Metric({label,value,description,tone='indigo'}) {
  const textTone=tone==='emerald'?'text-emerald-300':tone==='amber'?'text-amber-300':'text-indigo-300';
  return <div className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-800/80 px-4 py-4">
    <p className="text-xs text-slate-400">{label}</p>
    <p className={'mt-2 text-2xl font-black break-words '+textTone}>{value}</p>
    {description && <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{description}</p>}
  </div>;
}
function Notice({children,tone='slate'}) {
  return <div className={'rounded-xl border p-3 text-xs leading-relaxed '+(tone==='amber'?'border-amber-600/40 bg-amber-950/20 text-amber-200':'border-slate-700 bg-slate-900/50 text-slate-300')}>{children}</div>;
}
function Bars({items,valueKey='value',labelKey='label',title=''}){
  const vals=items.map(x=>Math.max(0,Number(x[valueKey]||0)));
  const max=Math.max(1,...vals);
  if(!items.length || vals.every(x=>x===0)) return <p className="text-sm text-slate-400">Não há registros suficientes para exibir este gráfico.</p>;
  return <div aria-label={title} className="flex items-end gap-2 overflow-x-auto border-b border-slate-700/70 pb-2" style={{minHeight:176}}>
    {items.map((item,i)=><div key={i} className="min-w-10 flex-1 flex flex-col items-center justify-end gap-1">
      <span className="text-[10px] tabular-nums text-slate-300">{number(vals[i])}</span>
      <div title={String(item[labelKey])+': '+number(vals[i])} className="w-full max-w-11 rounded-t-lg bg-gradient-to-t from-indigo-700 to-cyan-400" style={{height:Math.max(vals[i]>0?5:0,Math.round(120*vals[i]/max))}} />
      <span className="text-[10px] text-slate-400 whitespace-nowrap">{item[labelKey]}</span>
    </div>)}
  </div>;
}
function Horizontal({items,labelKey='label',valueKey='value'}){
  const max=Math.max(1,...items.map(x=>Number(x[valueKey]||0)));
  if(!items.length)return <p className="text-sm text-slate-400">Ainda não há dados nesta categoria.</p>;
  return <div className="space-y-3">
    {items.map((item,i)=><div key={i}>
      <div className="mb-1 flex justify-between gap-3 text-xs"><span className="text-slate-200 truncate">{item[labelKey]}</span><strong className="text-slate-200 tabular-nums">{number(item[valueKey])}</strong></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-950/70"><div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-emerald-400" style={{width:(100*Number(item[valueKey]||0)/max)+'%'}}/></div>
    </div>)}
  </div>;
}
function Summary({data}){
  const e=data.engagement,a=data.attendance,s=data.sports,f=data.finance;
  const adoption=pct(e.onboardedActiveAthletes,e.activeAthletes);
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Atletas ativos" value={number(e.activeAthletes)} description={number(e.approvedAccounts)+' contas aprovadas'}/>
      <Metric label="Adoção do portal" value={adoption===null?'—':adoption+'%'} description="Atletas ativos com conta aprovada"/>
      <Metric label="Último encontro registrado" value={a.recentDates.length?number(a.recentDates[a.recentDates.length-1].present):'—'} description="Presentes no último registro" tone="emerald"/>
      <Metric label="Partidas com súmula" value={number(s.matches)} description={number(s.matchDays)+' data(s) no ano'}/>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Presença nos últimos encontros" detail="Contagem de registros marcados como presentes; não é uma confirmação por GPS.">
        <Bars title="Presença por encontro" items={a.recentDates.map(x=>({label:shortDate(x.date),value:x.present}))}/>
        <p className="mt-3 text-xs text-slate-400">{a.recentEstimate===null?'Estimativa operacional indisponível: menos de quatro encontros.':'Referência para organizar o próximo encontro: média de '+a.recentEstimate+' presentes nos últimos quatro registros.'}</p>
      </Panel>
      <Panel title="Panorama financeiro" detail="Lançamentos contábeis e mensalidades são fontes diferentes.">
        <div className="grid grid-cols-2 gap-3"><Metric label="Receitas lançadas" value={money(f.receipts)} tone="emerald"/><Metric label="Despesas lançadas" value={money(f.expenses)} tone="amber"/><Metric label="Mensalidades recebidas" value={money(f.paid)}/><Metric label="Mensalidades previstas" value={money(f.due)}/></div>
      </Panel>
    </div>
    <Notice tone="amber">Dados operacionais, não relatório contábil auditado. O histórico de presenças pode incluir importações antigas, e as projeções esportivas exigem mais rodadas completas.</Notice>
  </div>;
}
function Engagement({data}){
 const e=data.engagement;
 const adoption=pct(e.onboardedActiveAthletes,e.activeAthletes);
 const devices=Object.entries(e.deviceCounts||{}).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
 const pages=Object.entries(e.tabCounts||{}).map(([key,value])=>({label:TAB_NAMES[key]||key,value})).sort((a,b)=>b.value-a.value);
 return <div className="space-y-4">
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   <Metric label="Contas aprovadas" value={number(e.approvedAccounts)} description="Entre todos os perfis"/>
   <Metric label="Adoção entre atletas ativos" value={adoption===null?'—':adoption+'%'} description={number(e.onboardedActiveAthletes)+' de '+number(e.activeAthletes)+' atletas ativos'}/>
   <Metric label="Pessoas que acessaram" value={number(e.distinctLoginUsers)} description="No ano selecionado"/>
   <Metric label="Sessões registradas" value={number(e.sessions)} description="Desde o início da coleta"/>
  </div>
  <div className="grid gap-4 xl:grid-cols-2">
   <Panel title="Dispositivos utilizados" detail="Contagem de sessões por categoria, sem fingerprint ou GPS."><Horizontal items={devices}/></Panel>
   <Panel title="Abas mais visitadas" detail={number(e.usageEvents)+' eventos autorizados; os dados dependem de aceite do usuário.'}><Horizontal items={pages}/></Panel>
  </div>
  <Notice>Somente {number(e.consentedUsers)} conta(s) autorizaram métricas opcionais de navegação. Não extrapole esses eventos para todo o elenco. Os dados de acesso começam no dia em que o monitoramento foi implantado.</Notice>
 </div>;
}
function Attendance({data}){
 const a=data.attendance;
 return <div className="space-y-4">
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   <Metric label="Datas com presença" value={number(a.dates)}/>
   <Metric label="Registros analisados" value={number(a.records)}/>
   <Metric label="Marcações de presença" value={number(a.totalPresent)} description="Soma de datas; não jogadores distintos" tone="emerald"/>
   <Metric label="Referência para o próximo jogo" value={a.recentEstimate===null?'—':a.recentEstimate+' atletas'} description={a.recentEstimate===null?'Mínimo de 4 encontros necessário':'Média dos 4 últimos encontros'}/>
  </div>
  <div className="grid gap-4 xl:grid-cols-2">
   <Panel title="Evolução recente de presença" detail="Últimos 12 encontros registrados."><Bars items={a.recentDates.map(d=>({label:shortDate(d.date),value:d.present}))}/></Panel>
   <Panel title="Assiduidade por atleta" detail="Número absoluto de presenças no ano; somente quem possui ao menos 3 registros.">
    {a.leaderboard.length?<div className="overflow-x-auto"><table className="w-full text-xs">
      <thead className="text-slate-400"><tr><th className="py-2 text-left">Atleta</th><th className="text-right">Presenças</th><th className="text-right">Frequência</th></tr></thead>
      <tbody>{a.leaderboard.map((r,i)=><tr className="border-t border-slate-700/70 text-slate-200" key={i}><td className="py-2">{r.name}</td><td className="text-right">{r.present}/{r.registered}</td><td className="text-right">{r.rate}%</td></tr>)}</tbody>
    </table></div>:<p className="text-sm text-slate-400">Sem histórico suficiente para ranking.</p>}
   </Panel>
  </div>
  <Panel title="Presença por mês" detail="Soma de presenças e quantidade de encontros cadastrados.">
   <Bars items={a.monthly.map(m=>({label:monthLabel(m.month),value:m.present}))}/>
  </Panel>
  <Notice tone="amber">{number(a.legacyRecords)} de {number(a.records)} registros vieram de fontes legadas/importações. A frequência é calculada sobre os registros existentes para cada atleta, e não representa necessariamente todos os domingos do período. A média recente é apenas uma referência operacional.</Notice>
 </div>;
}
function Sports({data}){
 const s=data.sports;
 return <div className="space-y-4">
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   <Metric label="Partidas com súmula" value={number(s.matches)}/>
   <Metric label="Dias registrados" value={number(s.matchDays)}/>
   <Metric label="Atletas nas súmulas" value={number(s.statAthletes)}/>
   <Metric label="Pontos no placar" value={number(s.scorePoints)} description="Soma dos placares salvos"/>
  </div>
  <Panel title="Desempenho por partida" detail="Média de pontos por atleta calculada como (2 × C2 + 3 × C3) / partidas registradas.">
   {s.performers.length?<div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm">
     <thead className="text-xs text-slate-400"><tr><th className="pb-3">Atleta</th><th className="pb-3 text-right">Partidas</th><th className="pb-3 text-right">Pontos</th><th className="pb-3 text-right">Média</th><th className="pb-3 text-right">REB</th><th className="pb-3 text-right">AST</th></tr></thead>
     <tbody>{s.performers.map((p,i)=><tr key={i} className="border-t border-slate-700 text-slate-200"><td className="py-3 font-bold">{p.name}</td><td className="text-right">{p.games}</td><td className="text-right">{p.points}</td><td className="text-right text-emerald-300 font-black">{p.avgPoints.toLocaleString('pt-BR')}</td><td className="text-right">{p.rebounds}</td><td className="text-right">{p.assists}</td></tr>)}</tbody>
   </table></div>:<p className="text-sm text-slate-400">Nenhuma partida com estatística de atletas neste ano.</p>}
  </Panel>
  <Notice tone="amber">{s.coverageNote||'Os indicadores estão disponíveis, mas devem ser interpretados juntamente com o volume de partidas salvas.'} Apenas súmulas gravadas são contabilizadas. Não comparar jogadores de amostras muito diferentes sem considerar o número de partidas.</Notice>
 </div>;
}
function Finance({data}){
 const f=data.finance;
 const paymentRate=pct(f.paid,f.due);
 return <div className="space-y-4">
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   <Metric label="Mensalidades previstas" value={money(f.due)} description={number(f.dues)+' cobranças no ano'}/>
   <Metric label="Mensalidades pagas" value={money(f.paid)} description={paymentRate===null?'Sem base':paymentRate+'% do previsto'} tone="emerald"/>
   <Metric label="Receitas lançadas" value={money(f.receipts)} description="Registros financeiros" tone="emerald"/>
   <Metric label="Despesas lançadas" value={money(f.expenses)} description="Registros financeiros" tone="amber"/>
  </div>
  <div className="grid gap-4 xl:grid-cols-2">
   <Panel title="Receitas por mês" detail="Lançamentos identificados como receita."><Bars items={f.monthly.map(m=>({label:monthLabel(m.month),value:m.revenue}))}/></Panel>
   <Panel title="Despesas por mês" detail="Lançamentos identificados como despesa."><Bars items={f.monthly.map(m=>({label:monthLabel(m.month),value:m.expense}))}/></Panel>
  </div>
  <Panel title="Situação financeira" detail="Saldo dos lançamentos (receitas menos despesas); não inclui ajustes históricos.">
   <div className="flex flex-wrap justify-between gap-3 text-sm text-slate-200"><span>Saldo calculado dos lançamentos</span><strong className="text-lg text-emerald-300">{money(f.ledgerBalance)}</strong></div>
   <p className="mt-2 text-xs text-slate-400">{number(f.overdue)} cobrança(s) ainda marcadas como pendente/parcial no ano, inclusive parcelas futuras.</p>
  </Panel>
  <Notice tone="amber">{f.note} Mensalidades não pagas não significam necessariamente inadimplência: o ano pode conter parcelas cujo vencimento ainda não ocorreu.</Notice>
 </div>;
}
export default function InteligenciaCBAPanel(){
 const currentYear=new Date().getFullYear();
 const [year,setYear]=useState(currentYear);
 const [section,setSection]=useState('geral');
 const [data,setData]=useState(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const years=useMemo(()=>Array.from({length:Math.max(1,currentYear-2023)},(_,i)=>currentYear-i),[currentYear]);
 const refresh=useCallback(async()=>{
  setLoading(true);setError('');
  try{const response=await adminPost('intelligenceDashboard',{year});setData(response.data);}
  catch(e){setError(e.message||'Não foi possível carregar a Inteligência CBA.');setData(null);}
  finally{setLoading(false);}
 },[year]);
 useEffect(()=>{refresh();},[refresh]);
 return <div className="space-y-5 text-slate-100">
  <header className="flex flex-wrap items-start justify-between gap-3">
   <div className="max-w-2xl">
    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-300"><ShieldCheck size={14}/> SUPER_ADMIN · Visão restrita</p>
    <h2 className="mt-1 text-2xl font-black">Inteligência CBA</h2>
    <p className="mt-1 text-sm text-slate-400">Dados reais do clube transformados em indicadores de participação, engajamento, desempenho e gestão.</p>
   </div>
   <div className="flex items-center gap-2">
    <label className="flex items-center gap-2 text-xs text-slate-400">Temporada
     <span className="relative"><select aria-label="Ano da Inteligência CBA" className="appearance-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pr-8 font-black text-white" value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-2 top-3"/></span>
    </label>
    <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"><RefreshCw size={15} className={loading?'animate-spin':''}/>Atualizar</button>
   </div>
  </header>
  <nav aria-label="Painéis da Inteligência CBA" className="flex gap-2 overflow-x-auto pb-1">
   {tabs.map(([id,label,Icon])=><button type="button" key={id} onClick={()=>setSection(id)} aria-pressed={section===id} className={'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition '+(section===id?'border-indigo-500 bg-indigo-600 text-white':'border-slate-700 bg-slate-800 text-slate-300 hover:border-indigo-400')}><Icon size={16}/>{label}</button>)}
  </nav>
  {error && <div role="alert" className="rounded-xl border border-rose-600/40 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div>}
  {loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-400"><RefreshCw size={16} className="animate-spin"/>Carregando dados de {year}...</p>}
  {!loading && data && <>
   {data.truncated && <Notice tone="amber">O volume de registros ultrapassou o limite de consulta. Alguns indicadores podem estar incompletos; não use como relatório definitivo.</Notice>}
   {section==='geral' && <Summary data={data}/>}
   {section==='engajamento' && <Engagement data={data}/>}
   {section==='presenca' && <Attendance data={data}/>}
   {section==='esporte' && <Sports data={data}/>}
   {section==='gestao' && <Finance data={data}/>}
   <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
    <span className="flex items-center gap-2"><CheckCircle2 size={13}/>Somente leitura · sem GPS ou exportação de dados pessoais</span>
    <span>Atualizado: {new Date(data.generatedAt).toLocaleString('pt-BR')}</span>
   </div>
  </>}
  {!loading && !data && !error && <div className="rounded-xl border border-slate-700 p-8 text-center text-sm text-slate-400"><Activity className="mx-auto mb-3"/>Ainda não há dados para exibir.</div>}
 </div>;
}
