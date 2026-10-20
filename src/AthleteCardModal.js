import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Download, Share2, X } from 'lucide-react';
import { CARD_HEIGHT, CARD_WIDTH, STORY_HEIGHT, drawAthleteCard, drawAthleteStory, drawMyRoundCard, drawMyRoundStory } from './athleteCardCanvas';
import { formatDate } from './athleteDashboardData';
import { myRoundCaption } from './myCbaStats';
import './AthleteCardModal.css';

export default function AthleteCardModal({ athlete, year, round = null, onClose }) {
  const canvasRef = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [format, setFormat] = useState('post');
  const [shareFile, setShareFile] = useState(null);
  const [photoUnavailable, setPhotoUnavailable] = useState(false);
  const [photoSlow, setPhotoSlow] = useState(false);
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const [renderRevision, setRenderRevision] = useState(0);
  const [message, setMessage] = useState('');
  const caption = round ? myRoundCaption(round) : '';
  const title = round ? `Minha rodada de ${formatDate(round.date)} • CBA` : `Temporada ${year} • CBA`;
  const slug = String(athlete.name || 'atleta').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `cba-${slug || 'atleta'}-${round ? `${round.date}-${format}` : `${year}${format === 'story' ? '-story' : ''}`}.png`;

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
    setReady(false); setShareFile(null); setPhotoUnavailable(false); setPhotoSlow(false); setMessage('');
    const draw = photo => {
      if (round) (format === 'story' ? drawMyRoundStory : drawMyRoundCard)(canvas, athlete, round, photo);
      else (format === 'story' ? drawAthleteStory : drawAthleteCard)(canvas, athlete, year, photo);
      setShareFile(null);
      setRenderRevision(value => value + 1);
    };
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
      setPhotoSlow(false);
      setReady(true);
    };
    photo.onload = () => {
      if (cancelled) return;
      window.clearTimeout(timeout);
      setPhotoSlow(false);
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
    timeout = window.setTimeout(() => { if (!cancelled) setPhotoSlow(true); }, 7000);
    photo.src = athlete.fotoUrl;
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      photo.onload = null;
      photo.onerror = null;
    };
  }, [athlete, year, round, format, photoAttempt]);

  useEffect(() => {
    if (!ready || !canvasRef.current || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return undefined;
    let cancelled = false;
    try {
      canvasRef.current.toBlob(blob => {
        if (cancelled || !blob) return;
        try {
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) setShareFile(file);
        } catch { /* Download remains available when file sharing is unsupported. */ }
      }, 'image/png');
    } catch { /* CORS/export errors are reported by the download action. */ }
    return () => { cancelled = true; };
  }, [ready, filename, renderRevision]);

  const changeFormat = next => {
    if (next === format) return;
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
    if (!ready || !shareFile) return;
    try {
      await navigator.share({ title, files: [shareFile], ...(round ? { text: caption } : {}) });
      setMessage('Card compartilhado.');
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage('Compartilhamento indisponível. Use Baixar PNG.');
    }
  };

  const copyCaption = async () => {
    try {
      if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(caption);
      setMessage('Legenda copiada.');
    } catch { setMessage('Não foi possível copiar. Selecione a legenda abaixo e copie manualmente.'); }
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
        link.download = filename;
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
        <div><span>{round ? 'Compartilhar minha rodada' : 'Compartilhe a temporada'}</span><h2 id="cba-card-title">Card de {athlete.name}{round ? ` · ${formatDate(round.date)}` : ''}</h2></div>
        <button ref={closeRef} type="button" className="cba-card-modal__close" aria-label="Fechar card" onClick={onClose}><X size={21} /></button>
      </div>
      <div className="cba-card-modal__body">
        <div className="cba-card-modal__preview">
          <canvas ref={canvasRef} width={CARD_WIDTH} height={format === 'story' ? STORY_HEIGHT : CARD_HEIGHT} style={{ aspectRatio: format === 'story' ? '9 / 16' : '4 / 5' }} role="img" aria-label={`Prévia do card de ${athlete.name} ${round ? `na rodada de ${formatDate(round.date)}` : `na temporada ${year}`}${format === 'story' ? ' para Stories' : ''}`} />
        </div>
        <div className="cba-card-modal__aside">
          <span className="cba-card-modal__eyebrow">{round ? `Rodada de ${formatDate(round.date)}` : `Temporada ${year}`}</span>
          <h3>{round ? 'Meu desempenho na rodada' : 'Pronto para publicar.'}</h3>
          <div className="cba-card-modal__formats" role="group" aria-label="Formato do card"><button type="button" aria-pressed={format === 'post'} onClick={() => changeFormat('post')}>Post · 1080 × 1350</button><button type="button" aria-pressed={format === 'story'} onClick={() => changeFormat('story')}>Story · 1080 × 1920</button></div>
          {round ? <><p>{round.pts ?? '—'} pontos · {round.reb ?? '—'} rebotes · {round.ast ?? '—'} assistências · {round.blk ?? '—'} tocos.</p><p>Totais da rodada, consolidados por data; podem reunir várias partidas. — indica dado não registrado.</p><p>Escolha o aplicativo e conclua a publicação. Se compartilhar arquivos não estiver disponível, use Baixar PNG.</p></> : <><p>O card mostra os números da temporada selecionada no formato {format === 'story' ? 'Story (1080 × 1920 px)' : 'post (1080 × 1350 px)'}.</p><p>As médias são por rodada com súmula; uma rodada pode incluir várias partidas na mesma data.</p></>}
          {!round && athlete.achievement?.earned && <p className="cba-card-modal__notice">Conquista no card: <strong>{athlete.achievement.title}</strong> · {year}</p>}
          {photoUnavailable && <p className="cba-card-modal__notice">O card está usando a inicial do atleta. Você pode tentar carregar a foto novamente.</p>}
          {photoSlow && !ready && <><p className="cba-card-modal__notice">A foto ainda está carregando. Aguarde ou escolha continuar com a inicial.</p><button type="button" className="cba-card-modal__share" onClick={() => { setPhotoUnavailable(true); setPhotoSlow(false); setReady(true); }}>Continuar com a inicial</button></>}
          {photoUnavailable && <button type="button" className="cba-card-modal__share" onClick={() => setPhotoAttempt(value => value + 1)}>Tentar carregar foto novamente</button>}
          {!ready && !message && <p role="status">Preparando a foto do atleta…</p>}
          {(round || shareFile) && <button type="button" className="cba-card-modal__share" onClick={share} disabled={!ready || !shareFile}><Share2 size={19} aria-hidden="true" /> Compartilhar imagem</button>}
          <button type="button" className="cba-card-modal__download" onClick={download} disabled={!ready}>
            <Download size={19} aria-hidden="true" /> Baixar PNG
          </button>
          {round && <><button type="button" className="cba-card-modal__share" onClick={copyCaption}><Copy size={19} aria-hidden="true"/> Copiar legenda</button><p aria-label="Legenda da rodada">{caption}</p></>}
          {message && <p className="cba-card-modal__status" role="status">{message}</p>}
        </div>
      </div>
    </section>
  </div>, document.body);
}
