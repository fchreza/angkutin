'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CANVAS_ITEMS, type CanvasItemDef } from './registry';
import { ListingCardVariant } from './ListingCardVariant';

/**
 * Papan canvas bebas untuk eksplorasi UI (prinsip skill "create-canvas").
 *
 * - Kamera {x, y, zoom} ditulis langsung ke transform DOM lewat ref —
 *   menggeser kamera TIDAK me-render ulang isi pratinjau. Isi pratinjau
 *   hanya berubah render saat posisinya sendiri berubah, dan tiap kartu
 *   dibungkus memo sehingga kartu lain tidak ikut render.
 * - Pan: seret area kosong. Zoom: Ctrl/Cmd + roda tetikus atau cubit
 *   (pinch), titik di bawah pointer tetap diam. Space + seret dan seret
 *   tombol tengah bisa pan dari mana saja.
 * - Item dipindah lewat handle di samping labelnya, BUKAN dari badan
 *   pratinjau — klik/ketik di dalam pratinjau tetap berperilaku normal.
 * - Yang disimpan ke localStorage HANYA posisi item (per id), kamera.
 *   Keanggotaan, nama, dan ukuran selalu dari registry di source.
 */

interface Point {
  x: number;
  y: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const STORAGE_KEY = 'angkutin-canvas-v1';
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const POS_LIMIT = 4000;
const DEFAULT_CAMERA: Camera = { x: 16, y: 16, zoom: 1 };

interface SavedLayout {
  version: 1;
  camera?: Camera;
  positions?: Record<string, Point>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFinitePoint(value: unknown): value is Point {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Point;
  return Number.isFinite(p.x) && Number.isFinite(p.y);
}

function isFiniteCamera(value: unknown): value is Camera {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Camera;
  return (
    Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.zoom)
  );
}

function defaultPositions(): Record<string, Point> {
  const result: Record<string, Point> = {};
  for (const item of CANVAS_ITEMS) {
    result[item.id] = { ...item.initialPosition };
  }
  return result;
}

function loadSaved(): SavedLayout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedLayout;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Salin teks tanpa Clipboard API (fallback konteks non-secure dsb.). */
function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

type Gesture =
  | {
      kind: 'pan';
      pointerId: number;
      startClient: Point;
      startCamera: Camera;
    }
  | {
      kind: 'item';
      pointerId: number;
      itemId: string;
      startClient: Point;
      startPos: Point;
    };

interface Pinch {
  startDist: number;
  startCamera: Camera;
  midWorld: Point;
}

/* ------------------------------------------------------------------ */
/* Satu item canvas: label (klik = salin nama) + handle geser + kartu. */
/* ------------------------------------------------------------------ */

interface ItemViewProps {
  item: CanvasItemDef;
  pos: Point;
  copied: boolean;
  onCopy: (item: CanvasItemDef) => void;
  onHandleKeyDown: (itemId: string, e: React.KeyboardEvent) => void;
}

const CanvasItemView = memo(function CanvasItemView({
  item,
  pos,
  copied,
  onCopy,
  onHandleKeyDown,
}: ItemViewProps) {
  return (
    <div
      data-canvas-item={item.id}
      className="absolute left-0 top-0"
      style={{
        width: item.width,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
      }}
    >
      <div className="mb-1 flex items-center gap-1.5 px-0.5">
        <button
          type="button"
          title="Klik untuk menyalin nama"
          onClick={() => onCopy(item)}
          className="text-xs font-medium text-neutral-600 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-neutral-300 dark:hover:text-white"
        >
          {item.name}
        </button>
        {copied && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Tersalin
          </span>
        )}
        <button
          type="button"
          data-canvas-handle
          aria-label={`Geser ${item.name}`}
          title="Seret untuk memindahkan — atau fokuskan, lalu pakai tombol panah"
          onKeyDown={(e) => onHandleKeyDown(item.id, e)}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
        >
          <svg
            width="10"
            height="16"
            viewBox="0 0 10 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="2.5" cy="3" r="1.3" />
            <circle cx="7.5" cy="3" r="1.3" />
            <circle cx="2.5" cy="8" r="1.3" />
            <circle cx="7.5" cy="8" r="1.3" />
            <circle cx="2.5" cy="13" r="1.3" />
            <circle cx="7.5" cy="13" r="1.3" />
          </svg>
        </button>
      </div>
      <ListingCardVariant name={item.name} variant={item.variant} />
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Papan canvas.                                                       */
/* ------------------------------------------------------------------ */

const TOOLBAR_BUTTON =
  'rounded px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-neutral-300 dark:hover:bg-neutral-800';

export function CanvasBoard() {
  const [positions, setPositions] =
    useState<Record<string, Point>>(defaultPositions);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const zoomLabelRef = useRef<HTMLSpanElement>(null);

  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA });
  const positionsRef = useRef<Record<string, Point>>(defaultPositions());

  const gestureRef = useRef<Gesture | null>(null);
  const pinchRef = useRef<Pinch | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const spaceHeldRef = useRef(false);

  const rafRef = useRef<number | null>(null);
  const pendingCameraRef = useRef<Camera | null>(null);
  const pendingPosRef = useRef<{ id: string; pos: Point } | null>(null);
  const pendingWheelRef = useRef<{
    px: number;
    py: number;
    delta: number;
  } | null>(null);

  const saveTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const applyCamera = useCallback(() => {
    const cam = cameraRef.current;
    const world = worldRef.current;
    if (world) {
      world.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.zoom})`;
    }
    if (zoomLabelRef.current) {
      zoomLabelRef.current.textContent = `${Math.round(cam.zoom * 100)}%`;
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      try {
        const payload: SavedLayout = {
          version: 1,
          camera: cameraRef.current,
          positions: positionsRef.current,
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Storage penuh/tidak tersedia: canvas tetap jalan tanpa simpan.
      }
    }, 250);
  }, []);

  /** Tulis semua perubahan tertunda — dipanggil maksimal sekali per frame. */
  const flushFrame = useCallback(() => {
    const wheel = pendingWheelRef.current;
    if (wheel) {
      pendingWheelRef.current = null;
      const cam = cameraRef.current;
      const zoom = clamp(
        cam.zoom * Math.exp(-wheel.delta * 0.002),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      const wx = (wheel.px - cam.x) / cam.zoom;
      const wy = (wheel.py - cam.y) / cam.zoom;
      cameraRef.current = {
        x: wheel.px - wx * zoom,
        y: wheel.py - wy * zoom,
        zoom,
      };
      applyCamera();
      scheduleSave();
    }
    if (pendingCameraRef.current) {
      cameraRef.current = pendingCameraRef.current;
      pendingCameraRef.current = null;
      applyCamera();
    }
    const pending = pendingPosRef.current;
    if (pending) {
      pendingPosRef.current = null;
      positionsRef.current = {
        ...positionsRef.current,
        [pending.id]: pending.pos,
      };
      setPositions(positionsRef.current);
    }
  }, [applyCamera, scheduleSave]);

  const scheduleFrame = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      flushFrame();
    });
  }, [flushFrame]);

  const fitAll = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const elements = vp.querySelectorAll<HTMLElement>('[data-canvas-item]');
    if (elements.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    elements.forEach((el) => {
      const id = el.dataset.canvasItem;
      const pos = id ? positionsRef.current[id] : undefined;
      if (!pos) return;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + el.offsetWidth);
      maxY = Math.max(maxY, pos.y + el.offsetHeight);
    });
    if (!Number.isFinite(minX)) return;
    const bw = maxX - minX;
    const bh = maxY - minY;
    const zoom = clamp(
      Math.min(vp.clientWidth / (bw + 48), vp.clientHeight / (bh + 48)),
      MIN_ZOOM,
      1.25,
    );
    cameraRef.current = {
      x: vp.clientWidth / 2 - ((minX + maxX) / 2) * zoom,
      y: vp.clientHeight / 2 - ((minY + maxY) / 2) * zoom,
      zoom,
    };
    applyCamera();
    scheduleSave();
  }, [applyCamera, scheduleSave]);

  const resetCamera = useCallback(() => {
    cameraRef.current = { ...DEFAULT_CAMERA };
    applyCamera();
    scheduleSave();
  }, [applyCamera, scheduleSave]);

  const zoomBy = useCallback(
    (factor: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const px = vp.clientWidth / 2;
      const py = vp.clientHeight / 2;
      const cam = cameraRef.current;
      const zoom = clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const wx = (px - cam.x) / cam.zoom;
      const wy = (py - cam.y) / cam.zoom;
      cameraRef.current = { x: px - wx * zoom, y: py - wy * zoom, zoom };
      applyCamera();
      scheduleSave();
    },
    [applyCamera, scheduleSave],
  );

  /* Muat layout tersimpan setelah mount (menghindari hydration mismatch),
     lalu terapkan. Tanpa kamera tersimpan, awali dengan fit-all. */
  useEffect(() => {
    const saved = loadSaved();
    if (saved?.positions) {
      const merged = { ...positionsRef.current };
      for (const item of CANVAS_ITEMS) {
        const p = saved.positions[item.id];
        if (isFinitePoint(p)) {
          merged[item.id] = {
            x: clamp(p.x, -POS_LIMIT, POS_LIMIT),
            y: clamp(p.y, -POS_LIMIT, POS_LIMIT),
          };
        }
      }
      positionsRef.current = merged;
      setPositions(merged);
    }
    if (saved?.camera && isFiniteCamera(saved.camera)) {
      cameraRef.current = {
        x: clamp(saved.camera.x, -POS_LIMIT * 2, POS_LIMIT * 2),
        y: clamp(saved.camera.y, -POS_LIMIT * 2, POS_LIMIT * 2),
        zoom: clamp(saved.camera.zoom, MIN_ZOOM, MAX_ZOOM),
      };
      applyCamera();
      return;
    }
    applyCamera();
    const raf = requestAnimationFrame(() => fitAll());
    return () => cancelAnimationFrame(raf);
  }, [applyCamera, fitAll]);

  /* Zoom roda tetikus: listener native non-pasif supaya preventDefault
     bekerja (React memasang wheel sebagai pasif di root). */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const prev = pendingWheelRef.current;
      pendingWheelRef.current = {
        px: e.clientX - rect.left,
        py: e.clientY - rect.top,
        delta: (prev?.delta ?? 0) + e.deltaY,
      };
      scheduleFrame();
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [scheduleFrame]);

  /* Lacak tombol Space untuk pan-dari-mana-saja. */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        t?.isContentEditable
      ) {
        return;
      }
      spaceHeldRef.current = true;
      // Cegah halaman ikut scroll hanya bila fokus sedang tidak di kontrol.
      if (t === document.body || t === viewportRef.current) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeldRef.current = false;
    };
    const blur = () => {
      spaceHeldRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  /* Flush simpanan tertunda saat komponen dilepas. */
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        try {
          const payload: SavedLayout = {
            version: 1,
            camera: cameraRef.current,
            positions: positionsRef.current,
          };
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // abaikan
        }
      }
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ------------------------------ gestur ------------------------------ */

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const vp = viewportRef.current;
    if (!vp) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      // Pointer kedua turun: beralih ke pinch, batalkan gestur tunggal.
      const [p1, p2] = [...pointersRef.current.values()];
      const rect = vp.getBoundingClientRect();
      const midClient = {
        x: (p1.x + p2.x) / 2 - rect.left,
        y: (p1.y + p2.y) / 2 - rect.top,
      };
      const cam = cameraRef.current;
      pinchRef.current = {
        startDist: Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y)),
        startCamera: { ...cam },
        midWorld: {
          x: (midClient.x - cam.x) / cam.zoom,
          y: (midClient.y - cam.y) / cam.zoom,
        },
      };
      gestureRef.current = null;
      vp.setPointerCapture(e.pointerId);
      return;
    }
    if (pointersRef.current.size > 2) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-canvas-toolbar]')) return;

    const itemEl = target.closest<HTMLElement>('[data-canvas-item]');
    const onHandle = target.closest('[data-canvas-handle]') != null;
    const forcePan = e.button === 1 || spaceHeldRef.current;

    if (onHandle && itemEl && e.button === 0) {
      const id = itemEl.dataset.canvasItem;
      if (!id || !positionsRef.current[id]) return;
      gestureRef.current = {
        kind: 'item',
        pointerId: e.pointerId,
        itemId: id,
        startClient: { x: e.clientX, y: e.clientY },
        startPos: { ...positionsRef.current[id] },
      };
      vp.setPointerCapture(e.pointerId);
      return;
    }

    // Klik di dalam pratinjau (bukan handle): biarkan interaksi aslinya
    // jalan, kecuali pan paksa (Space / tombol tengah).
    if (itemEl && !forcePan) return;

    if (e.button === 0 || e.button === 1) {
      e.preventDefault();
      gestureRef.current = {
        kind: 'pan',
        pointerId: e.pointerId,
        startClient: { x: e.clientX, y: e.clientY },
        startCamera: { ...cameraRef.current },
      };
      vp.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const vp = viewportRef.current;
      if (!vp) return;
      const [p1, p2] = [...pointersRef.current.values()];
      const rect = vp.getBoundingClientRect();
      const dist = Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y));
      const mid = {
        x: (p1.x + p2.x) / 2 - rect.left,
        y: (p1.y + p2.y) / 2 - rect.top,
      };
      const zoom = clamp(
        pinch.startCamera.zoom * (dist / pinch.startDist),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      pendingCameraRef.current = {
        x: mid.x - pinch.midWorld.x * zoom,
        y: mid.y - pinch.midWorld.y * zoom,
        zoom,
      };
      scheduleFrame();
      return;
    }

    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    if (gesture.kind === 'pan') {
      pendingCameraRef.current = {
        x: gesture.startCamera.x + (e.clientX - gesture.startClient.x),
        y: gesture.startCamera.y + (e.clientY - gesture.startClient.y),
        zoom: gesture.startCamera.zoom,
      };
      scheduleFrame();
    } else {
      const zoom = cameraRef.current.zoom;
      pendingPosRef.current = {
        id: gesture.itemId,
        pos: {
          x: clamp(
            gesture.startPos.x + (e.clientX - gesture.startClient.x) / zoom,
            -POS_LIMIT,
            POS_LIMIT,
          ),
          y: clamp(
            gesture.startPos.y + (e.clientY - gesture.startClient.y) / zoom,
            -POS_LIMIT,
            POS_LIMIT,
          ),
        },
      };
      scheduleFrame();
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (gestureRef.current?.pointerId === e.pointerId) {
      gestureRef.current = null;
      scheduleSave();
    }
  };

  /* --------------------------- aksi label ----------------------------- */

  const copyName = useCallback((item: CanvasItemDef) => {
    const done = () => {
      setCopiedId(item.id);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedId(null), 1200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(item.name)
        .then(done)
        .catch(() => {
          if (fallbackCopy(item.name)) done();
        });
    } else if (fallbackCopy(item.name)) {
      done();
    }
  }, []);

  const handleItemKeyDown = useCallback(
    (itemId: string, e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 40 : 8;
      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case 'ArrowLeft':
          dx = -step;
          break;
        case 'ArrowRight':
          dx = step;
          break;
        case 'ArrowUp':
          dy = -step;
          break;
        case 'ArrowDown':
          dy = step;
          break;
        default:
          return;
      }
      e.preventDefault();
      const current = positionsRef.current[itemId];
      if (!current) return;
      const pos = {
        x: clamp(current.x + dx, -POS_LIMIT, POS_LIMIT),
        y: clamp(current.y + dy, -POS_LIMIT, POS_LIMIT),
      };
      positionsRef.current = { ...positionsRef.current, [itemId]: pos };
      setPositions(positionsRef.current);
      scheduleSave();
    },
    [scheduleSave],
  );

  /* ------------------------------ render ------------------------------ */

  return (
    <div
      ref={viewportRef}
      className="relative w-full touch-none overflow-hidden bg-neutral-100 dark:bg-neutral-950"
      style={{ height: 'calc(100dvh - 11rem)', minHeight: 480 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        ref={worldRef}
        className="absolute left-0 top-0 h-full w-full will-change-transform"
        style={{ transformOrigin: '0 0' }}
      >
        {CANVAS_ITEMS.map((item) => (
          <CanvasItemView
            key={item.id}
            item={item}
            pos={positions[item.id]}
            copied={copiedId === item.id}
            onCopy={copyName}
            onHandleKeyDown={handleItemKeyDown}
          />
        ))}
      </div>

      <div
        data-canvas-toolbar
        className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white/95 p-1 shadow-md dark:border-neutral-700 dark:bg-neutral-900/95"
      >
        <button
          type="button"
          className={TOOLBAR_BUTTON}
          onClick={() => zoomBy(1 / 1.2)}
          aria-label="Perkecil (zoom out)"
        >
          −
        </button>
        <span
          ref={zoomLabelRef}
          className="w-11 text-center text-xs tabular-nums text-neutral-500 dark:text-neutral-400"
        >
          100%
        </span>
        <button
          type="button"
          className={TOOLBAR_BUTTON}
          onClick={() => zoomBy(1.2)}
          aria-label="Perbesar (zoom in)"
        >
          +
        </button>
        <div className="mx-0.5 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
        <button type="button" className={TOOLBAR_BUTTON} onClick={fitAll}>
          Fit
        </button>
        <button type="button" className={TOOLBAR_BUTTON} onClick={resetCamera}>
          Reset
        </button>
      </div>
    </div>
  );
}
