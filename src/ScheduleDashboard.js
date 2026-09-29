import React, { useCallback, useEffect, useRef, useState } from 'react';
import { portalPost } from './cbaApi';
import { EventsView, GamesView } from './PortalExperienceBridge';

export default function ScheduleDashboard({ tab, refreshKey = 0 }) {
  const controllerRef = useRef(null);
  const [state, setState] = useState({ data: null, error: '', loading: true });

  const load = useCallback(async ({ quiet = false } = {}) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (!quiet) setState(previous => ({ ...previous, error: '', loading: true }));
    try {
      const data = await portalPost('bootstrap', {}, { signal: controller.signal });
      if (!controller.signal.aborted) setState({ data, error: '', loading: false });
      return data;
    } catch (error) {
      if (controller.signal.aborted) return null;
      setState(previous => ({ ...previous, error: error?.message || 'Falha ao carregar os compromissos.', loading: false }));
      throw error;
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
    return () => controllerRef.current?.abort();
  }, [load, refreshKey]);

  if (state.loading && !state.data) return <div role="status" className="rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center text-slate-300">Carregando {tab === 'jogos' ? 'jogos' : 'eventos'}...</div>;
  if (!state.data) return <div role="alert" className="rounded-3xl border border-rose-500/30 bg-slate-900 p-6 text-white"><h2 className="text-lg font-black">Não foi possível carregar {tab === 'jogos' ? 'os jogos' : 'os eventos'}</h2><p className="mt-2 text-sm text-slate-300">{state.error}</p><button type="button" onClick={() => load().catch(() => {})} className="mt-4 rounded-xl bg-emerald-500 px-4 py-2.5 font-black text-slate-950">Tentar novamente</button></div>;

  const View = tab === 'jogos' ? GamesView : EventsView;
  return <div>
    {state.error && <div role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-200">Não foi possível atualizar os dados: {state.error} <button type="button" onClick={() => load({ quiet: true }).catch(() => {})} className="ml-2 font-black underline">Tentar novamente</button></div>}
    <View data={state.data} refresh={() => load({ quiet: true })}/>
  </div>;
}
