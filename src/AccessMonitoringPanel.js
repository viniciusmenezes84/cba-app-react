import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminPost } from './cbaApi';

const dateTime = value => {
  if (!value) return '—';
  try { return new Date(value).toLocaleString('pt-BR'); } catch { return '—'; }
};
const formatName = key => ({
  inicio:'Início',presenca:'Presença',relatorios:'Relatórios',atleta:'Atleta',
  mesario:'Mesário',financas:'Finanças',jogos:'Jogos',eventos:'Eventos',
  sorteio:'Sorteio',dm:'Departamento Médico',halldafama:'Hall da Fama',
  estatuto:'Estatuto',notificacoes:'Notificações'
})[key] || key;

export default function AccessMonitoringPanel() {
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState('');

  const refresh=useCallback(async()=>{
    try {
      setLoading(true);
      const result=await adminPost('accessMonitoring');
      setData(result.data);
      setError('');
    } catch(err){setError(err.message || 'Não foi possível carregar o monitoramento');}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{refresh();},[refresh]);

  const filtered=useMemo(()=>(data?.sessions || []).filter(s =>
    (s.name+' '+s.email+' '+s.os+' '+s.device).toLowerCase().includes(filter.toLowerCase())
  ),[data?.sessions,filter]);
  const popular=useMemo(()=>Object.entries(data?.tabCounts || {}).sort((a,b)=>b[1]-a[1]),[data?.tabCounts]);
  const daily=useMemo(()=>Object.entries(data?.dailyCounts||{}).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14),[data?.dailyCounts]);

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-black text-white">Monitoramento de acessos</h2>
        <p className="text-xs text-slate-400 mt-1">Visibilidade exclusiva do proprietário. Sem geolocalização, IP bruto ou fingerprint.</p>
      </div>
      <button type="button" onClick={refresh} disabled={loading} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Atualizar dados</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-700 bg-rose-950/30 px-4 py-3 text-rose-200">{error}</div>}
    {data && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Online agora',data.onlineUsers],
          ['Sessões registradas (90 dias)',data.sessionCount],
          ['Usuários cadastrados',data.knownUsers],
          ['Autorizações para métricas',data.consent?.yes || 0]
        ].map(([label,value])=><div key={label} className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>)}
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
        <h3 className="font-bold text-white">Abas mais utilizadas (com autorização)</h3>
        <p className="text-xs text-slate-400 mt-1">Contagens de visualização, não registros de conteúdo.</p>
        {popular.length===0 ? <p className="text-sm text-slate-400 mt-3">Ainda não há eventos autorizados.</p> :
          <div className="mt-3 space-y-3">{popular.slice(0,12).map(([name,count])=>
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-sm"><span className="text-slate-200">{formatName(name)}</span><span className="font-bold text-slate-200">{count}</span></div>
              <div className="h-2 rounded-full bg-slate-900"><div className="h-full rounded-full bg-indigo-500" style={{width:(100*count/popular[0][1])+'%'}}/></div>
            </div>)}</div>}
      </div>
      {daily.length>0 && <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
        <h3 className="font-bold text-white mb-3">Atividade diária das abas (últimos 14 dias com registros)</h3>
        <div className="flex h-36 items-end gap-2 overflow-x-auto">
          {daily.map(([day,count])=><div key={day} className="min-w-9 flex-1 flex flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-slate-300">{count}</span>
            <div title={day} className="w-full max-w-10 rounded-t bg-emerald-600" style={{height:Math.max(4,100*count/Math.max(...daily.map(x=>x[1])))+'px'}}/>
            <span className="text-[10px] text-slate-400">{day.slice(8)}</span>
          </div>)}
        </div>
      </div>}
      <div className="rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
        <div className="p-4 flex flex-wrap gap-3 items-center justify-between">
          <div><h3 className="font-bold text-white">Histórico de sessões</h3><p className="text-xs text-slate-400">Online requer sinal de atividade nos últimos 2 minutos. Não é uma localização do usuário.</p></div>
          <input aria-label="Filtrar jogador ou dispositivo" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar jogador ou dispositivo" className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
        </div>
        <div className="overflow-x-auto"><table className="min-w-[860px] w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400"><tr>{['Jogador','Status','Início','Última atividade','Fim','Dispositivo','Sistema','Navegador','Modo'].map(x=><th className="p-3" key={x}>{x}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-700/60">{filtered.slice(0,250).map((s,i)=><tr key={i} className="text-slate-200">
            <td className="p-3"><strong className="block">{s.name}</strong><span className="text-slate-400">{s.role}</span></td>
            <td className="p-3">{s.online ? '● Online' : 'Offline'}</td><td className="p-3">{dateTime(s.startedAt)}</td>
            <td className="p-3">{dateTime(s.lastActiveAt)}</td><td className="p-3">{dateTime(s.endedAt)}</td>
            <td className="p-3">{s.device}</td><td className="p-3">{s.os}</td><td className="p-3">{s.browser}</td><td className="p-3">{s.mode}</td>
          </tr>)}</tbody></table></div>
        {filtered.length===0 && <p className="p-4 text-sm text-slate-400">Ainda não há sessões registradas após a atualização.</p>}
      </div>
      <p className="text-xs text-slate-400">{data.note}</p>
    </>}
    {loading && !data && <p role="status" className="text-slate-300">Consultando dados de acesso...</p>}
  </div>;
}
