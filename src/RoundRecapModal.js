import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share2, X } from 'lucide-react';
import { RECAP_HEIGHT, RECAP_STORY_HEIGHT, RECAP_WIDTH, drawRoundRecap, drawRoundRecapStory } from './roundRecapCanvas';
import './AthleteCardModal.css';

export default function RoundRecapModal({ recap, onClose }) {
  const canvasRef = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const [format, setFormat] = useState('post');
  const [ready, setReady] = useState(false);
  const [shareFile, setShareFile] = useState(null);
  const [message, setMessage] = useState('');
  const filename = () => `cba-rodada-${recap.date}${format === 'story' ? '-story' : ''}.png`;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    try {
      (format === 'story' ? drawRoundRecapStory : drawRoundRecap)(canvasRef.current, recap);
      setReady(true);
      setMessage('');
    } catch (error) {
      setReady(false);
      setMessage(error?.message || 'Não foi possível criar o card.');
    }
  }, [recap, format]);

  useEffect(() => {
    if (!ready || typeof navigator.share !== 'function') return undefined;
    let cancelled = false;
    canvasRef.current.toBlob(blob => {
      if (cancelled || !blob) return;
      const file = new File([blob], filename(), { type: 'image/png' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) setShareFile(file);
    }, 'image/png');
    return () => { cancelled = true; };
  // O canvas é redesenhado para cada formato e resumo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, format, recap]);

  const changeFormat = next => {
    setReady(false);
    setShareFile(null);
    setFormat(next);
  };
  const handleKeyDown = event => {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    const buttons = [...(dialogRef.current?.querySelectorAll('button:not(:disabled)') || [])];
    if (event.shiftKey && document.activeElement === buttons[0]) {
      event.preventDefault(); buttons.at(-1)?.focus();
    } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
      event.preventDefault(); buttons[0]?.focus();
    }
  };
  const download = () => {
    if (!ready) return;
    try {
      canvasRef.current.toBlob(blob => {
        if (!blob) { setMessage('Não foi possível exportar o PNG neste navegador.'); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename();
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
        setMessage('Card baixado em PNG.');
      }, 'image/png');
    } catch { setMessage('Não foi possível exportar o PNG neste navegador.'); }
  };
  const share = async () => {
    try {
      await navigator.share({ title: `Rodada ${recap.date} • CBA`, files: [shareFile] });
      setMessage('Card compartilhado.');
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage('Compartilhamento indisponível. Use Baixar PNG.');
    }
  };

  return createPortal(<div className="cba-card-modal" onKeyDown={handleKeyDown}>
    <div className="cba-card-modal__scrim" onClick={onClose} aria-hidden="true" />
    <section ref={dialogRef} className="cba-card-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="cba-recap-title">
      <div className="cba-card-modal__header">
        <div><span>Compartilhe a rodada</span><h2 id="cba-recap-title">Resumo de {recap.date.split('-').reverse().join('/')}</h2></div>
        <button ref={closeRef} type="button" className="cba-card-modal__close" aria-label="Fechar resumo" onClick={onClose}><X size={21}/></button>
      </div>
      <div className="cba-card-modal__body">
        <div className="cba-card-modal__preview"><canvas ref={canvasRef} width={RECAP_WIDTH} height={format === 'story' ? RECAP_STORY_HEIGHT : RECAP_HEIGHT} style={{ aspectRatio: format === 'story' ? '9 / 16' : '4 / 5' }} role="img" aria-label={`Prévia do resumo da rodada de ${recap.date}`}/></div>
        <div className="cba-card-modal__aside">
          <span className="cba-card-modal__eyebrow">{recap.players} atletas com súmula</span>
          <h3>A rodada em números.</h3>
          <div className="cba-card-modal__formats" role="group" aria-label="Formato do resumo">
            <button type="button" aria-pressed={format === 'post'} onClick={() => changeFormat('post')}>Post · 1080 × 1350</button>
            <button type="button" aria-pressed={format === 'story'} onClick={() => changeFormat('story')}>Story · 1080 × 1920</button>
          </div>
          <p>{recap.totals.pts} pontos · {recap.totals.reb} rebotes · {recap.totals.ast} assistências registrados na data.</p>
          <p>{recap.matches?.length ? `${recap.matches.length} placar(es) registrados. ` : 'Partidas antigas podem não ter placar registrado. '}A súmula é consolidada por dia e pode incluir várias partidas.</p>
          {shareFile && <button type="button" className="cba-card-modal__share" onClick={share}><Share2 size={19}/> Compartilhar imagem</button>}
          <button type="button" className="cba-card-modal__download" onClick={download} disabled={!ready}><Download size={19}/> Baixar PNG</button>
          {message && <p className="cba-card-modal__status" role="status">{message}</p>}
        </div>
      </div>
    </section>
  </div>, document.body);
}
