'use client';
import { useEffect, useRef } from 'react';

const RECONNECT_DELAY_MS = 3000;

export function useEventSource(url: string | null, onMessage: (e: MessageEvent) => void) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!url) return;
    let active = true;
    let es: EventSource | null = null;
    const connect = () => {
      if (!active) return;
      es = new EventSource(url);
      es.onmessage = (e) => handlerRef.current(e);
      es.onerror = () => { es?.close(); if (active) setTimeout(connect, RECONNECT_DELAY_MS); };
    };
    connect();
    return () => { active = false; es?.close(); };
  }, [url]);
}
