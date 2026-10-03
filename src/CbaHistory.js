import React, { useEffect, useRef } from 'react';
import { ArrowLeft, BookOpen, MapPin, Users } from 'lucide-react';

export const FOUNDERS = ['Lucas Portugal', 'Neilor Leite', 'Alysson Costa', 'Vinicius Menezes'];

const CHAPTERS = [
  {
    marker: '01', period: 'Há mais de 20 anos', title: 'O basquete como elo',
    text: 'Uma amizade de mais de duas décadas tinha no basquete um de seus vínculos mais fortes. A vida seguiu, mas aquela ligação continuou fazendo parte da história do grupo.'
  },
  {
    marker: '02', period: 'Depois de uma longa pausa', title: 'O reencontro',
    text: 'Após mais de 15 anos sem jogarem juntos e sem se encontrar, uma ideia reuniu os amigos para uma partida. Naquele momento ainda não havia nome, quadra fixa ou um formato definido. Havia apenas a vontade de voltar a jogar.'
  },
  {
    marker: '03', period: 'Domingos pela manhã', title: 'A quadra do Resgate',
    text: 'Jogo após jogo, amigos e jogadores daquela época voltaram a se encontrar. Os convites entre conhecidos e as redes sociais fizeram o grupo crescer. Uma quadra pública no bairro do Resgate, em Salvador, tornou-se o ponto de encontro das manhãs de domingo.'
  }
];

export default function CbaHistory({ onBack }) {
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  return <section aria-labelledby="cba-history-title" className="mx-auto max-w-5xl space-y-7 pb-24 text-slate-100 md:pb-8">
    <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">
      <ArrowLeft className="h-4 w-4" aria-hidden="true"/> Voltar ao Hall da Fama
    </button>

    <header className="relative overflow-hidden rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 px-6 py-10 shadow-2xl sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" aria-hidden="true"/>
      <div className="relative max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.18em] text-amber-300"><BookOpen className="h-4 w-4" aria-hidden="true"/> Memória do CBA</span>
        <h2 ref={headingRef} tabIndex={-1} id="cba-history-title" className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-white outline-none sm:text-5xl">Uma amizade que voltou para a quadra.</h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">O CBA começou com um reencontro. O que seria apenas uma partida se tornou um compromisso de domingo e abriu espaço para antigos e novos amigos jogarem juntos outra vez.</p>
        <p className="mt-6 border-l-2 border-amber-400 pl-4 text-sm font-semibold text-amber-200">Mais de 20 anos de amizade. Uma nova história em cada jogo.</p>
      </div>
    </header>

    <div className="grid gap-7 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-9">
      <section aria-labelledby="cba-history-chapters" className="min-w-0">
        <div className="mb-6"><p className="text-xs font-black uppercase tracking-[.18em] text-amber-400">Como tudo começou</p><h3 id="cba-history-chapters" className="mt-2 text-2xl font-black text-white">Os primeiros capítulos</h3></div>
        <ol className="relative space-y-4 border-l border-amber-500/25 pl-5 sm:pl-7">
          {CHAPTERS.map(chapter => <li key={chapter.marker} className="relative rounded-2xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-lg sm:p-6">
            <span aria-hidden="true" className="absolute -left-[2.18rem] top-6 flex h-7 w-7 items-center justify-center rounded-full border border-amber-500/50 bg-slate-950 text-[10px] font-black text-amber-300 sm:-left-[2.68rem]">{chapter.marker}</span>
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">{chapter.period}</p>
            <h4 className="mt-2 text-xl font-black text-white">{chapter.title}</h4>
            <p className="mt-3 text-sm leading-6 text-slate-300">{chapter.text}</p>
          </li>)}
        </ol>
      </section>

      <aside aria-labelledby="cba-history-founders" className="self-start rounded-3xl border border-slate-700 bg-slate-900/75 p-5 shadow-xl sm:p-6">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><Users className="h-5 w-5" aria-hidden="true"/></div><div><p className="text-[11px] font-black uppercase tracking-widest text-amber-400">As pessoas</p><h3 id="cba-history-founders" className="text-xl font-black text-white">Criadores do CBA</h3></div></div>
        <p className="mt-4 text-sm leading-6 text-slate-400">Quatro amigos estiveram no início dessa retomada. O grupo cresceu com cada pessoa que aceitou voltar à quadra.</p>
        <ul className="mt-5 space-y-2.5">{FOUNDERS.map(name => <li key={name} className="flex items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-black text-amber-300">{name.split(' ').map(part => part[0]).slice(0,2).join('')}</span><span className="font-bold text-slate-100">{name}</span></li>)}</ul>
        <p className="mt-5 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" aria-hidden="true"/> Salvador, Bahia</p>
      </aside>
    </div>

    <section aria-labelledby="cba-history-identity" className="overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl sm:p-8">
      <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-amber-400">O nome</p><h3 id="cba-history-identity" className="mt-2 text-2xl font-black text-white">Um nome para o reencontro</h3><p className="mt-4 text-sm leading-7 text-slate-300">À medida que os encontros cresceram, surgiu a vontade de dar um título à reunião de amigos. O grupo passou a ser conhecido como CBA — Clube Basquete dos Aposentados.</p></div>
        <div className="border-t border-slate-700 pt-7 md:border-l md:border-t-0 md:pl-10 md:pt-0"><p className="text-xs font-black uppercase tracking-[.18em] text-amber-400">A marca</p><h3 className="mt-2 text-2xl font-black text-white">Uma foto inesperada</h3><p className="mt-4 text-sm leading-7 text-slate-300">No primeiro churrasco de comemoração, alguém registrou discretamente um dos amigos procurando onde se apoiar. Ele encontrou um cabo de vassoura. A foto daquele instante inspirou a logo do CBA — e até hoje não se sabe quem fez o registro.</p></div>
      </div>
    </section>

    <p className="px-2 text-center text-xs leading-5 text-slate-500">Esta é a primeira versão da memória do CBA. Fotos e novos relatos poderão enriquecer os próximos capítulos.</p>
  </section>;
}
