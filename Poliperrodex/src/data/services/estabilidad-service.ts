import { Accelerometer } from 'expo-sensors';

// Ventana de observación y umbral de varianza, en g². Son puntos de partida:
// hay que calibrarlos con tu teléfono, igual que el acelerómetro de la caída.
const VENTANA_MS = 300;
const UMBRAL_VARIANZA = 0.0025;

// Entrega solo un dato: "quieto" o "no quieto". Quien lo usa no conoce vectores.
// Devuelve la función para dejar de escuchar.
export function escucharEstabilidad(alCambiar: (quieto: boolean) => void): () => void {
  let muestras: { t: number; m: number }[] = [];
  let ultimo: boolean | null = null;

  Accelerometer.setUpdateInterval(40);
  const suscripcion = Accelerometer.addListener(({ x, y, z }) => {
    const ahora = Date.now();
    const m = Math.sqrt(x * x + y * y + z * z);
    muestras.push({ t: ahora, m });
    muestras = muestras.filter((s) => ahora - s.t <= VENTANA_MS);
    if (muestras.length < 3) return;

    const media = muestras.reduce((suma, s) => suma + s.m, 0) / muestras.length;
    const varianza =
      muestras.reduce((suma, s) => suma + (s.m - media) ** 2, 0) / muestras.length;

    const quieto = varianza < UMBRAL_VARIANZA;
    if (quieto !== ultimo) {
      ultimo = quieto;
      alCambiar(quieto);
    }
  });

  return () => suscripcion.remove();
}