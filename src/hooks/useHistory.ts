// src/hooks/useHistory.ts

import { useState, useCallback } from 'react';
import { MangaPage, MangaLayer } from '../types';

export interface HistorySnapshot {
  layers: MangaLayer[];
  cleaningDataUrl: string;
}

export function useHistory(
  pages: MangaPage[],
  setPages: React.Dispatch<React.SetStateAction<MangaPage[]>>,
  currentPageIndexRef: React.MutableRefObject<number>,
  pagesRef: React.MutableRefObject<MangaPage[]>,
  setActiveLayer: (layer: MangaLayer | null) => void,
  addToast: (msg: string, type?: 'error' | 'success') => void
) {
  const [history, setHistory] = useState<Record<number, { undo: HistorySnapshot[]; redo: HistorySnapshot[] }>>({});

  const pushSnapshot = useCallback((customLayers?: MangaLayer[], customCleaningUrl?: string) => {
    const idx = currentPageIndexRef.current;
    if (idx === -1) return;
    const page = pagesRef.current[idx];
    if (!page) return;

    const activeLayers = customLayers !== undefined ? customLayers : [...page.layers];
    const activeCleaningUrl = customCleaningUrl !== undefined ? customCleaningUrl : (page.cleaningDataUrl || '');

    setHistory(prev => {
      const pageHist = prev[idx] || { undo: [], redo: [] };
      const newUndo = [...pageHist.undo.slice(-29), { layers: activeLayers, cleaningDataUrl: activeCleaningUrl }];
      return {
        ...prev,
        [idx]: {
          undo: newUndo,
          redo: []
        }
      };
    });
  }, [currentPageIndexRef, pagesRef]);

  const pushToHistory = useCallback((newLayersState: MangaLayer[]) => {
    const idx = currentPageIndexRef.current;
    const page = pagesRef.current[idx];
    pushSnapshot(newLayersState, page?.cleaningDataUrl || '');
  }, [currentPageIndexRef, pagesRef, pushSnapshot]);

  const handleUndo = useCallback(() => {
    const idx = currentPageIndexRef.current;
    if (idx === -1) return;
    const page = pagesRef.current[idx];
    if (!page) return;

    const pageHist = history[idx];
    if (!pageHist || pageHist.undo.length === 0) {
      addToast('لا توجد خطوات سابقة للتراجع عنها', 'error');
      return;
    }

    const currentState: HistorySnapshot = {
      layers: page.layers,
      cleaningDataUrl: page.cleaningDataUrl || ''
    };

    const previousState = pageHist.undo[pageHist.undo.length - 1];

    setPages(prev =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        return {
          ...p,
          layers: previousState.layers,
          cleaningDataUrl: previousState.cleaningDataUrl || undefined
        };
      })
    );

    setHistory(prev => {
      const ph = prev[idx];
      return {
        ...prev,
        [idx]: {
          undo: ph.undo.slice(0, -1),
          redo: [...ph.redo, currentState]
        }
      };
    });

    setActiveLayer(null);
    addToast('✓ تراجع عن آخر خطوة موحدة ↩', 'success');
  }, [currentPageIndexRef, pagesRef, history, setPages, setActiveLayer, addToast]);

  const handleRedo = useCallback(() => {
    const idx = currentPageIndexRef.current;
    if (idx === -1) return;
    const page = pagesRef.current[idx];
    if (!page) return;

    const pageHist = history[idx];
    if (!pageHist || pageHist.redo.length === 0) {
      addToast('لا تتوفر خطوات لإعادة تطبيقها', 'error');
      return;
    }

    const currentState: HistorySnapshot = {
      layers: page.layers,
      cleaningDataUrl: page.cleaningDataUrl || ''
    };

    const nextState = pageHist.redo[pageHist.redo.length - 1];

    setPages(prev =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        return {
          ...p,
          layers: nextState.layers,
          cleaningDataUrl: nextState.cleaningDataUrl || undefined
        };
      })
    );

    setHistory(prev => {
      const ph = prev[idx];
      return {
        ...prev,
        [idx]: {
          undo: [...ph.undo, currentState],
          redo: ph.redo.slice(0, -1)
        }
      };
    });

    setActiveLayer(null);
    addToast('✓ إعادة تطبيق آخر خطوة موحدة ↪', 'success');
  }, [currentPageIndexRef, pagesRef, history, setPages, setActiveLayer, addToast]);

  return {
    history,
    pushSnapshot,
    pushToHistory,
    handleUndo,
    handleRedo,
  };
}
