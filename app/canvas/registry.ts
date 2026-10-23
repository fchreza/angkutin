/**
 * Registry canvas eksplorasi UI.
 *
 * Semua keanggotaan canvas hidup di sini, di source — bukan di storage
 * browser. Menambah varian = menambah entri di daftar ini; logika kamera
 * dan gestur di CanvasBoard tidak perlu diubah.
 *
 * - `id`   : stabil, dipakai sebagai key React dan kunci posisi tersimpan.
 * - `name` : nama terbaca yang tampil sebagai label di atas pratinjau dan
 *            disalin persis saat label diklik. Nama ini juga menjadi nama
 *            grup kontrol DialKit untuk varian tersebut.
 * - `initialPosition` : posisi awal di koordinat canvas, dipakai untuk
 *            entri baru dan entri yang belum punya posisi tersimpan.
 * - `width`: lebar pratinjau dalam px (koordinat canvas).
 */

export type CanvasVariant = 'compact' | 'standar' | 'lebar';

export interface CanvasItemDef {
  id: string;
  name: string;
  variant: CanvasVariant;
  initialPosition: { x: number; y: number };
  width: number;
}

export const CANVAS_ITEMS: CanvasItemDef[] = [
  {
    id: 'kartu-compact',
    name: 'Kartu listing · compact',
    variant: 'compact',
    initialPosition: { x: 40, y: 32 },
    width: 420,
  },
  {
    id: 'kartu-standar',
    name: 'Kartu listing · standar',
    variant: 'standar',
    initialPosition: { x: 540, y: 32 },
    width: 320,
  },
  {
    id: 'kartu-lebar',
    name: 'Kartu listing · lebar',
    variant: 'lebar',
    initialPosition: { x: 40, y: 320 },
    width: 600,
  },
];
