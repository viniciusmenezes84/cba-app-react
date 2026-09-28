import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share2, X } from 'lucide-react';
import { CARD_HEIGHT, CARD_WIDTH, STORY_HEIGHT, drawAthleteCard, drawAthleteStory } from './athleteCardCanvas';
import './AthleteCardModal.css';

export default function AthleteCardModal({ athlete, year, onClose }) {
  const canvasRef = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [format, setFormat] = useState('post');
  const [shareFile, setShareFile] = useState(null);
  const [photoUnavailable, setPhotoUnavailable] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeout;
    const canvas = canvasRef.current;
    const draw = photo => (format === 'story' ? drawAthleteStory : drawAthleteCard)(canvas, athlete, year, photo);
    try {
      draw();
    } catch (error) {
      setMessage(error.message || 'Não foi possível criar o card.');
      return undefined;
    }

    if (!athlete.fotoUrl) {
      setReady(true);
      return undefined;
    }

    const photo = new Image();
    // Only CORS-approved photos enter the canvas, so the PNG remains exportable.
    photo.crossOrigin = 'anonymous';
    const fallback = () => {
      if (cancelled) return;
      setPhotoUnavailable(true);
      setReady(true);
    };
    photo.onload = () => {
      if (cancelled) return;
      window.clearTimeout(timeout);
      try {
        draw(photo);
        setPhotoUnavailable(false);
      } catch {
        setPhotoUnavailable(true);
      }
      setReady(true);
    };
    photo.onerror = () => {
      window.clearTimeout(timeout);
      fallback();
    };
    timeout = window.setTimeout(fallback, 7000);
    photo.src = athlete.fotoUrl;
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      photo.onload = null;
      photo.onerror = null;
    };
  }, [athlete, year, format]);

  useEffect(() => {
    if (!ready || !canvasRef.current || typeof navigator.share !== 'function') return undefined;
    let cancelled = false;
    canvasRef.current.toBlob(blob => {
      if (cancelled || !blob) return;
      const file = new File([blob], filename(), { type: 'image/png' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) setShareFile(file);
    }, 'image/png');
    return () => { cancelled = true; };
  // The canvas was redrawn whenever these values or ready changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, format, athlete, year]);

  const filename = () => {
    const slug = String(athlete.name || 'atleta').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `cba-${slug || 'atleta'}-${year}${format === 'story' ? '-story' : ''}.png`;
  };

  const changeFormat = next => {
    setReady(false);
    setShareFile(null);
    setMessage('');
    setFormat(next);
  };

  const handleKeyDown = event => {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    const buttons = [...(dialogRef.current?.querySelectorAll('button:not(:disabled)') || [])];
    if (event.shiftKey && document.activeElement === buttons[0]) {
      event.preventDefault();
      buttons.at(-1)?.focus();
    } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
      event.preventDefault();
      buttons[0]?.focus();
    }
  };

  const share = async () => {
    if (!shareFile) return;
    try {
      await navigator.share({ title: `Temporada ${year} • CBA`, files: [shareFile] });
      setMessage('Card compartilhado.');
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage('Compartilhamento indisponível. Use Baixar PNG.');
    }
  };

  const download = () => {
    if (!ready || !canvasRef.current) return;
    try {
      canvasRef.current.toBlob(blob => {
        if (!blob) {
          setMessage('Não foi possível exportar o PNG neste navegador.');
          return;
        }
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
    } catch {
      setMessage('Não foi possível exportar o PNG neste navegador.');
    }
  };

  return createPortal(<div className="cba-card-modal" onKeyDown={handleKeyDown}>
    <div className="cba-card-modal__scrim" onClick={onClose} aria-hidden="true" />
    <section ref={dialogRef} className="cba-card-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="cba-card-title">
      <div className="cba-card-modal__header">
        <div><span>Compartilhe a temporada</span><h2 id="cba-card-title">Card de {athlete.name}</h2></div>
        <button ref={closeRef} type="button" className="cba-card-modal__close" aria-label="Fechar card" onClick={onClose}><X size={21} /></button>
      </div>
      <div className="cba-card-modal__body">
        <div className="cba-card-modal__preview">
          <canvas ref={canvasRef} width={CARD_WIDTH} height={format === 'story' ? STORY_HEIGHT : CARD_HEIGHT} style={{ aspectRatio: format === 'story' ? '9 / 16' : '4 / 5' }} role="img" aria-label={`Prévia do card de ${athlete.name} na temporada ${year}${format === 'story' ? ' para Stories' : ''}`} />
        </div>
        <div className="cba-card-modal__aside">
          <span className="cba-card-modal__eyebrow">Temporada {year}</span>
          <h3>Pronto para publicar.</h3>
          <div className="cba-card-modal__formats" role="group" aria-label="Formato do card"><button type="button" aria-pressed={format === 'post'} onClick={() => changeFormat('post')}>Post · 1080 × 1350</button><button type="button" aria-pressed={format === 'story'} onClick={() => changeFormat('story')}>Story · 1080 × 1920</button></div>
          <p>O card mostra os números da temporada selecionada no formato {format === 'story' ? 'Story (1080 × 1920 px)' : 'post (1080 × 1350 px)'}.</p>
          <p>As médias são por rodada com súmula; uma rodada pode incluir várias partidas na mesma data.</p>
          {photoUnavailable && <p className="cba-card-modal__notice">A foto não permitiu exportação. O card usa a inicial do atleta.</p>}
          {!ready && !message && <p role="status">Preparando a foto do atleta…</p>}
          {shareFile && <button type="button" className="cba-card-modal__share" onClick={share}><Share2 size={19} aria-hidden="true" /> Compartilhar imagem</button>}
          <button type="button" className="cba-card-modal__download" onClick={download} disabled={!ready}>
            <Download size={19} aria-hidden="true" /> Baixar PNG
          </button>
          {message && <p className="cba-card-modal__status" role="status">{message}</p>}
        </div>
      </div>
    </section>
  </div>, document.body);
}
