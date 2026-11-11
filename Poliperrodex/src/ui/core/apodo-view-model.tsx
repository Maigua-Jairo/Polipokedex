import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { entrenadorRepository, type Entrenador } from '@/data/repositories/entrenador-repository';

// ViewModel compartido. Ya no guarda nada por su cuenta: escucha la sesión
// a través del repositorio y expone comandos para la vista.
type EstadoApodo = {
  apodo: string | null;
  listo: boolean;
  iniciarSesion: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const ApodoContext = createContext<EstadoApodo | null>(null);

export function ApodoProvider({ children }: { children: ReactNode }) {
  const [entrenador, setEntrenador] = useState<Entrenador | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    entrenadorRepository
      .obtenerEntrenador()
      .then(setEntrenador)
      .catch(() => setEntrenador(null))
      .finally(() => setListo(true));

    return entrenadorRepository.suscribirse(setEntrenador);
  }, []);

  async function iniciarSesion() {
    await entrenadorRepository.iniciarSesionConGoogle();
  }

  async function cerrarSesion() {
    await entrenadorRepository.cerrarSesion();
  }

  return (
    <ApodoContext.Provider
      value={{ apodo: entrenador?.apodo ?? null, listo, iniciarSesion, cerrarSesion }}
    >
      {children}
    </ApodoContext.Provider>
  );
}

export function useApodo(): EstadoApodo {
  const valor = useContext(ApodoContext);
  if (!valor) throw new Error('useApodo debe usarse dentro de <ApodoProvider>');
  return valor;
}