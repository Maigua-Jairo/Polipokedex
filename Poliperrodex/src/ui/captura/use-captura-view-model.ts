import { useCallback, useEffect, useRef, useState } from 'react';

import { avistamientosRepository } from '@/data/repositories/avistamientos-repository';
import { perrosRepository } from '@/data/repositories/perros-repository';
import { escucharCaidas } from '@/data/services/acelerometro-service';
import { escucharEstabilidad } from '@/data/services/estabilidad-service';
import { medirNitidez, NITIDEZ_MINIMA } from '@/data/services/nitidez-services';
import { obtenerUbicacionActual } from '@/data/services/ubicacion-service';
import type { Perro } from '@/domain/models/perro';

export type PasoCaptura = 'listo' | 'fotografiando' | 'analizando' | 'ubicando' | 'guardando';

type Parametros = {
  apodo: string;
  // Solo escuchamos los sensores mientras la pantalla está a la vista.
  activo: boolean;
};

export function useCapturaViewModel({ apodo, activo }: Parametros) {
  const [perros, setPerros] = useState<Perro[]>([]);
  const [perroId, setPerroId] = useState<string | null>(null);
  const [paso, setPaso] = useState<PasoCaptura>('listo');
  const [error, setError] = useState<string | null>(null);
  const [seCayo, setSeCayo] = useState(false);
  // Empieza en false: no se dispara hasta que el sensor confirme que está quieto.
  const [quieto, setQuieto] = useState(false);

  const capturaEnCurso = useRef<AbortController | null>(null);

  useEffect(() => {
    perrosRepository
      .listar()
      .then(setPerros)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!activo || seCayo) return;
    return escucharCaidas(() => {
      capturaEnCurso.current?.abort();
      setSeCayo(true);
    });
  }, [activo, seCayo]);

  useEffect(() => {
    if (!activo) return;
    return escucharEstabilidad(setQuieto);
  }, [activo]);

  const capturar = useCallback(
    async (tomarFoto: () => Promise<string | undefined>): Promise<boolean> => {
      if (!perroId) return false;
      if (!quieto) {
        setError('Mantén el teléfono quieto un momento');
        return false;
      }

      const controlador = new AbortController();
      capturaEnCurso.current = controlador;
      setError(null);

      try {
        setPaso('fotografiando');
        const fotoUri = await tomarFoto();
        if (!fotoUri) throw new Error('La cámara no devolvió ninguna foto');
        if (controlador.signal.aborted) return false;

        // La validación va antes de subir: una foto borrosa nunca llega a Storage.
        setPaso('analizando');
        const nitidez = await medirNitidez(fotoUri);
        if (controlador.signal.aborted) return false;
        if (nitidez < NITIDEZ_MINIMA) {
          setError('La foto salió borrosa. Mantén el teléfono quieto e inténtalo otra vez.');
          return false;
        }

        setPaso('ubicando');
        const { latitud, longitud } = await obtenerUbicacionActual();
        if (controlador.signal.aborted) return false;

        setPaso('guardando');
        await avistamientosRepository.registrarCaptura(
          { perroId, apodo, fotoUri, latitud, longitud },
          controlador.signal,
        );
        return true;
      } catch (e) {
        if (!controlador.signal.aborted) {
          setError(e instanceof Error ? e.message : 'No se pudo completar la captura');
        }
        return false;
      } finally {
        capturaEnCurso.current = null;
        setPaso('listo');
      }
    },
    [perroId, apodo, quieto],
  );

  return {
    perros,
    perroId,
    paso,
    error,
    seCayo,
    quieto,
    puedeCapturar: perroId !== null && paso === 'listo' && !seCayo && quieto,
    seleccionarPerro: setPerroId,
    capturar,
    cerrarAvisoCaida: () => setSeCayo(false),
  };
}