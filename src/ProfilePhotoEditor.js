import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { portalPost, uploadProfilePhoto } from './cbaApi';
import { drawProfileCrop, encodeProfilePhoto, prepareProfilePhoto } from './profilePhoto';

const initialCrop = { zoom: 1, horizontal: 0, vertical: 0 };
const button = 'min-h-11 rounded-xl border border-slate-600 px-3 py-2 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:opacity-50';
const accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

export default function ProfilePhotoEditor({ photoUrl, disabled, onSaved, onEditingChange }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(null);
  const [crop, setCrop] = useState(initialCrop);
  const [phase, setPhase] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const canvas = useRef(null), picker = useRef(null), camera = useRef(null);
  const loaded = useRef(null), generation = useRef(0), request = useRef(null), locked = useRef(false);
  const busy = !!phase;
  useEffect(() => () => { generation.current += 1; loaded.current?.dispose(); request.current?.abort(); }, []);
  useEffect(() => {
    if (source && canvas.current) {
      try { drawProfileCrop(canvas.current, source.image, crop, 320); }
      catch (e) { setError(e.message); }
    }
  }, [source, crop]);

  function toggle(value) {
    setOpen(value); onEditingChange?.(value);
    setError(''); setConfirmRemove(false);
    if (!value) { generation.current += 1; loaded.current?.dispose(); loaded.current = null; setSource(null); }
  }
  async function choose(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || locked.current) return;
    const current = ++generation.current;
    setPhase('Preparando foto…'); setError(''); setMessage(''); setConfirmRemove(false);
    loaded.current?.dispose(); loaded.current = null; setSource(null);
    try {
      const prepared = await prepareProfilePhoto(file);
      if (current !== generation.current) { prepared.dispose(); return; }
      loaded.current = prepared; setSource(prepared); setCrop(initialCrop);
    } catch (e) { if (current === generation.current) setError(e.message); }
    finally { if (current === generation.current) setPhase(''); }
  }
  async function save(remove = false) {
    if (locked.current || disabled || (!remove && !source)) return;
    locked.current = true;
    const current = generation.current;
    const controller = new AbortController(); request.current = controller;
    setError(''); setMessage(''); setProgress(0); setPhase(remove ? 'Removendo foto…' : 'Comprimindo foto…');
    try {
      let result;
      if (remove) result = await portalPost('removeMyPhoto', {}, { signal: controller.signal });
      else {
        const imageBase64 = await encodeProfilePhoto(source.image, crop);
        if (controller.signal.aborted) return;
        setPhase('Enviando foto…');
        result = await uploadProfilePhoto(imageBase64, { signal: controller.signal, onProgress: setProgress });
      }
      if (current !== generation.current) return;
      onSaved(result.profile);
      toggle(false); setMessage(remove ? 'Foto removida.' : 'Foto atualizada com sucesso.');
    } catch (e) { if (current === generation.current && !controller.signal.aborted) setError(e.message || 'Não foi possível salvar a foto. Tente novamente.'); }
    finally { locked.current = false; if (current === generation.current || !controller.signal.aborted) setPhase(''); }
  }

  return <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
    {!open && <button type="button" className={`${button} inline-flex items-center gap-2`} disabled={disabled} onClick={() => { setMessage(''); toggle(true); }}><Camera size={18} aria-hidden="true" />Alterar foto</button>}
    {!open && disabled && <p className="mt-2 text-xs text-slate-400">Salve a edição do perfil antes de alterar a foto.</p>}
    {open && <div className="space-y-4">
      <h3 className="text-lg font-black">Sua foto de perfil</h3>
      <p className="text-sm leading-6 text-slate-400">Escolha uma foto e ajuste o enquadramento. JPG, PNG, WebP ou HEIC/HEIF, até 15 MB.</p>
      <input ref={picker} type="file" accept={accept} onChange={choose} disabled={busy} className="sr-only" tabIndex={-1} aria-label="Arquivo da foto" />
      <input ref={camera} type="file" accept={accept} capture="user" onChange={choose} disabled={busy} className="sr-only" tabIndex={-1} aria-label="Foto da câmera" />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${button} inline-flex items-center gap-2`} disabled={busy} onClick={() => picker.current?.click()}><ImagePlus size={16} aria-hidden="true" />Escolher foto</button>
        <button type="button" className={`${button} sm:hidden`} disabled={busy} onClick={() => camera.current?.click()}>Tirar foto</button>
      </div>
      {source && <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <canvas ref={canvas} role="img" aria-label="Prévia do enquadramento da foto" className="mx-auto aspect-square w-full max-w-80 rounded-2xl bg-slate-950" />
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <legend className="mb-3 text-sm font-bold">Ajustar enquadramento</legend>
          {[['zoom', 'Zoom', 1, 3, 0.01], ['horizontal', 'Posição horizontal', -100, 100, 1], ['vertical', 'Posição vertical', -100, 100, 1]].map(([key, label, min, max, step]) => <label key={key} className="block text-sm font-bold">{label}<input type="range" className="mt-2 block min-h-11 w-full accent-emerald-400" min={min} max={max} step={step} value={crop[key]} onChange={event => setCrop(previous => ({ ...previous, [key]: Number(event.target.value) }))} /></label>)}
          <button type="button" className={button} onClick={() => setCrop(initialCrop)}>Centralizar</button>
        </fieldset>
      </div>}
      {busy && <div role="status" className="text-sm text-emerald-300">{phase === 'Enviando foto…' && progress >= 95 ? 'Salvando no perfil…' : phase}{phase === 'Enviando foto…' && <progress aria-label="Progresso do envio" max={100} value={progress} className="mt-2 block w-full accent-emerald-400" />}</div>}
      <div className="flex flex-wrap gap-2">
        {source && <button type="button" className={`${button} border-emerald-500 bg-emerald-500 text-slate-950`} disabled={busy || disabled} onClick={() => save()}>Salvar foto</button>}
        <button type="button" className={button} disabled={busy} onClick={() => toggle(false)}>Cancelar</button>
        {photoUrl && !confirmRemove && <button type="button" className={`${button} inline-flex items-center gap-2 text-rose-300`} disabled={busy} onClick={() => setConfirmRemove(true)}><Trash2 size={16} aria-hidden="true" />Remover foto</button>}
      </div>
      {confirmRemove && <div className="rounded-xl border border-rose-500/30 p-3"><p className="text-sm">Remover sua foto atual? Seu perfil passará a mostrar sua inicial.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={() => save(true)}>Confirmar remoção</button><button type="button" className={button} disabled={busy} onClick={() => setConfirmRemove(false)}>Manter foto</button></div></div>}
      <p className="text-xs leading-5 text-slate-400">A imagem é reduzida automaticamente e usada no perfil e nos cards do CBA. Ela ficará acessível por link para exibição e compartilhamento.</p>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-300">{message}</p>}
  </div>;
}
