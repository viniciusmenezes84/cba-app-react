import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { CARD_HEIGHT, CARD_WIDTH, drawAthleteCard } from './athleteCardCanvas';
import './AthleteCardModal.css';

export default function AthleteCardModal({ athlete, year, onClose }) {
  const canvasRef = useRef(null);
  const closeRef = useRef(null);
  const downloadRef = useRef(null);
  const [ready, setReady] = useState(false);
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
    try {
      drawAthleteCard(canvas, athlete, year);
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
        drawAthleteCard(canvas, athlete, year, photo);
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
  }, [athlete, year]);

  const handleKeyDown = event => {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === closeRef.current) {
      event.preventDefault();
      (downloadRef.current?.disabled ? closeRef.current : downloadRef.current)?.focus();
    } else if (!event.shiftKey && (document.activeElement === downloadRef.current || downloadRef.current?.disabled)) {
      event.preventDefault();
      closeRef.current?.focus();
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
        const slug = String(athlete.name || 'atleta').normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cba-${slug || 'atleta'}-${year}.png`;
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
    <section className="cba-card-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="cba-card-title">
      <div className="cba-card-modal__header">
        <div><span>Compartilhe a temporada</span><h2 id="cba-card-title">Card de {athlete.name}</h2></div>
        <button ref={closeRef} type="button" className="cba-card-modal__close" aria-label="Fechar card" onClick={onClose}><X size={21} /></button>
      </div>
      <div className="cba-card-modal__body">
        <div className="cba-card-modal__preview">
          <canvas ref={canvasRef} width={CARD_WIDTH} height={CARD_HEIGHT} role="img" aria-label={`Prévia do card de ${athlete.name} na temporada ${year}`} />
        </div>
        <div className="cba-card-modal__aside">
          <span className="cba-card-modal__eyebrow">Temporada {year}</span>
          <h3>Pronto para publicar.</h3>
          <p>O card mostra os números da temporada selecionada em um formato vertical de 1080 × 1350 px.</p>
          <p>As médias são por rodada com súmula; uma rodada pode incluir várias partidas na mesma data.</p>
          {photoUnavailable && <p className="cba-card-modal__notice">A foto não permitiu exportação. O card usa a inicial do atleta.</p>}
          {!ready && !message && <p role="status">Preparando a foto do atleta…</p>}
          <button ref={downloadRef} type="button" className="cba-card-modal__download" onClick={download} disabled={!ready}>
            <Download size={19} aria-hidden="true" /> Baixar PNG
          </button>
          {message && <p className="cba-card-modal__status" role="status">{message}</p>}
        </div>
      </div>
    </section>
  </div>, document.body);
}
