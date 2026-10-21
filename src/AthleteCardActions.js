import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Copy, Download, Instagram, Share2, X } from 'lucide-react';

function WhatsAppIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.7l1.5-4.8A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="m8.2 7.2 1.4-.1 1.1 2.6-.9 1.1c.6 1.3 1.6 2.3 2.9 2.9l1.1-.9 2.6 1.1-.1 1.4c-.2 1.2-1.6 1.7-2.6 1.4-3.5-1-6.2-3.7-7.2-7.2-.3-1 .2-2.4 1.7-2.3Z"/></svg>;
}

const destinations = ['Instagram', 'WhatsApp', 'Telegram', 'X', 'Slack', 'TikTok', 'Outros aplicativos'];

export default function AthleteCardActions({ ready, busy, canShareFiles, format, caption, onFormatChange, onShare, onDownload, onCopy }) {
  const [panel, setPanel] = useState(null);
  const panelRef = useRef(null);
  const toolbarRef = useRef(null);
  const triggerRef = useRef(null);
  const id = useId();

  useEffect(() => {
    if (panel) (panelRef.current?.querySelector('[role="menuitem"], [role="menuitemradio"]')
      || panelRef.current?.querySelector('button:not(:disabled)'))?.focus();
    panelRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [panel]);

  useEffect(() => {
    if (!panel) return undefined;
    const dismiss = event => {
      if (!panelRef.current?.contains(event.target) && !toolbarRef.current?.contains(event.target)) setPanel(null);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [panel]);

  const close = () => { setPanel(null); triggerRef.current?.focus(); };
  const open = (next, event) => {
    if (event) triggerRef.current = event.currentTarget;
    setPanel(next);
  };
  const toggle = (kind, event) => panel?.kind === kind ? close() : open({ kind, root: kind }, event);
  const selectDestination = label => {
    if (label === 'Instagram') open({ kind: 'instagram', root: panel?.root || 'instagram' });
    else if (label === 'TikTok') {
      onFormatChange('story');
      open({ kind: 'manual', label, root: 'share' });
    } else open({ kind: 'destination', label, root: panel?.root || 'whatsapp' });
  };
  const instagramChoice = choice => {
    onFormatChange(choice === 'Feed' ? 'post' : 'story');
    open({ kind: choice === 'Reels' ? 'manual' : 'destination', label: 'Instagram', choice, root: panel.root });
  };
  const keyDown = event => {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); close(); return;
    }
    if (event.key === 'Tab') {
      const controls = [...panelRef.current.closest('[role="dialog"]').querySelectorAll('button:not(:disabled)')]
        .filter(button => !panelRef.current.contains(button));
      const index = controls.indexOf(triggerRef.current);
      event.preventDefault(); event.stopPropagation(); setPanel(null);
      controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const scope = panelRef.current.querySelector('[role="menu"]') || panelRef.current;
    const buttons = [...scope.querySelectorAll('button:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault(); event.stopPropagation(); buttons[next]?.focus();
  };
  const menu = panel && ['share', 'instagram', 'format'].includes(panel.kind);
  const panelTitle = panel?.kind === 'instagram' ? 'Onde você quer publicar no Instagram?'
    : panel?.kind === 'format' ? 'Formato do card' : panel?.kind === 'share' ? 'Compartilhar com'
    : panel?.choice === 'Reels' ? 'Preparar arte para Reels' : `Compartilhar no ${panel?.label}`;

  return <div className="cba-card-actions">
    <div ref={toolbarRef}>
      <div className="cba-card-actions__format"><button type="button" disabled={busy} aria-label="Escolher formato" aria-haspopup="menu" aria-expanded={panel?.kind === 'format'} aria-controls={panel?.kind === 'format' ? id : undefined} onClick={event => toggle('format', event)}>{format === 'story' ? 'Story' : 'Post'}<ChevronDown size={14} aria-hidden="true"/></button></div>
      <div className="cba-card-actions__toolbar" role="group" aria-label="Ações do card">
        <button type="button" disabled={busy} className="cba-card-actions__whatsapp" aria-label="Compartilhar no WhatsApp" aria-expanded={panel?.root === 'whatsapp'} aria-controls={panel?.root === 'whatsapp' ? id : undefined} onClick={event => open({ kind: 'destination', label: 'WhatsApp', root: 'whatsapp' }, event)}><WhatsAppIcon/><span>WhatsApp</span></button>
        <button type="button" disabled={busy} aria-label="Compartilhar no Instagram" aria-haspopup="menu" aria-expanded={panel?.root === 'instagram'} aria-controls={panel?.root === 'instagram' ? id : undefined} onClick={event => toggle('instagram', event)}><Instagram size={20} aria-hidden="true"/><span>Instagram</span></button>
        <button type="button" disabled={busy} aria-label="Compartilhar" aria-haspopup="menu" aria-expanded={panel?.root === 'share'} aria-controls={panel?.root === 'share' ? id : undefined} onClick={event => toggle('share', event)}><Share2 size={20} aria-hidden="true"/><span>Compartilhar</span></button>
        <button type="button" disabled={!ready || busy} className="cba-card-actions__download" onClick={onDownload}><Download size={20} aria-hidden="true"/><span>Baixar PNG</span></button>
        {caption && <button type="button" disabled={busy} onClick={onCopy}><Copy size={20} aria-hidden="true"/><span>Copiar legenda</span></button>}
      </div>
    </div>
    {panel && <div id={id} ref={panelRef} className="cba-card-actions__panel" onKeyDown={keyDown}>
      <div className="cba-card-actions__panel-heading"><h3 id={`${id}-title`}>{panelTitle}</h3><button type="button" aria-label="Fechar opções de compartilhamento" onClick={close}><X size={17} aria-hidden="true"/></button></div>
      {menu ? <div role="menu" aria-labelledby={`${id}-title`}>
        {panel.kind === 'share' && destinations.map(label => <button type="button" role="menuitem" key={label} onClick={() => selectDestination(label)}>{label}</button>)}
        {panel.kind === 'instagram' && ['Feed', 'Story', 'Reels'].map(choice => <button type="button" role="menuitem" key={choice} onClick={() => instagramChoice(choice)}>{choice}</button>)}
        {panel.kind === 'format' && [['post', 'Post'], ['story', 'Story']].map(([value, label]) => <button type="button" role="menuitemradio" aria-checked={format === value} key={value} onClick={() => { onFormatChange(value); close(); }}>{label}</button>)}
      </div> : <div role="region" aria-labelledby={`${id}-title`}>
        {panel.kind === 'manual' ? <><p>{panel.choice === 'Reels' ? 'Reels precisa de vídeo. Este PNG não é um vídeo pronto: baixe a arte vertical e adicione-a ao editor de Reels no Instagram para criar seu vídeo.' : 'Baixe a imagem vertical e importe no editor do TikTok. A criação de vídeo, quando necessária, fica no aplicativo.'}</p><button type="button" disabled={!ready || busy} onClick={onDownload}>Baixar arte para editar</button></> : <>
          <p>{panel.label === 'Outros aplicativos' ? 'Escolha um aplicativo no seletor do aparelho.' : `Escolha ${panel.label} no seletor do aparelho${panel.choice ? ` e conclua a escolha de ${panel.choice} no aplicativo` : ''}.`} Os aplicativos disponíveis dependem do dispositivo.</p>
          {canShareFiles ? <button type="button" disabled={!ready || busy} onClick={() => onShare(panel.label)}>Abrir seletor de aplicativos</button>
            : <p>{!ready ? 'Aguarde a imagem ficar pronta.' : 'Compartilhamento de imagem indisponível neste navegador. Use Baixar PNG'}{ready && caption ? ' e Copiar legenda.' : ready ? '.' : ''}</p>}
          {panel.label === 'Instagram' && <p>O portal prepara a imagem; você confirma o destino e a publicação no Instagram.</p>}
        </>}
        {caption && <p>A legenda pode ser copiada separadamente; o aplicativo pode ignorar o texto enviado com o PNG.</p>}
      </div>}
    </div>}
  </div>;
}
