import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';

// Por debajo de este valor, la foto se considera borrosa. Calíbralo (ver nota).
export const NITIDEZ_MINIMA = 50;

// Varianza del Laplaciano sobre una imagen en escala de grises. Los bordes
// nítidos producen respuestas altas; una imagen movida o desenfocada las
// suaviza y la varianza baja.
export function varianzaLaplaciano(rgba: Uint8Array, ancho: number, alto: number): number {
  const gris = new Float32Array(ancho * alto);
  for (let i = 0, p = 0; i < gris.length; i++, p += 4) {
    gris[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }

  let suma = 0;
  let suma2 = 0;
  let n = 0;
  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      const i = y * ancho + x;
      const laplaciano =
        gris[i - ancho] + gris[i + ancho] + gris[i - 1] + gris[i + 1] - 4 * gris[i];
      suma += laplaciano;
      suma2 += laplaciano * laplaciano;
      n++;
    }
  }
  const media = suma / n;
  return suma2 / n - media * media;
}

// Trabaja sobre una miniatura de 128 px: más rápido en el teléfono y suficiente
// para detectar movimiento o desenfoque grueso.
export async function medirNitidez(uri: string): Promise<number> {
  const miniatura = await ImageManipulator.manipulate(uri)
    .resize({ width: 128 })
    .renderAsync();
  const guardada = await miniatura.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });

  const bytes = await new File(guardada.uri).bytes();
  const { data, width, height } = jpeg.decode(bytes, { useTArray: true });
  return varianzaLaplaciano(data, width, height);
}