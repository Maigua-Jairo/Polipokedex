import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../services/supabase-service';

export type Entrenador = { id: string; apodo: string };

// Cierra el navegador de autenticación al volver a la app. Debe ejecutarse
// una vez al cargar el módulo.
WebBrowser.maybeCompleteAuthSession();

// El apodo sale del nombre de Google. La tabla exige entre 3 y 20 caracteres.
function aEntrenador(session: Session | null): Entrenador | null {
  const usuario = session?.user;
  if (!usuario) return null;
  const nombre = String(usuario.user_metadata?.full_name ?? '').trim().slice(0, 20);
  const apodo = nombre.length >= 3 ? nombre : `Entrenador ${usuario.id.slice(0, 4)}`;
  return { id: usuario.id, apodo };
}

export const entrenadorRepository = {
  async obtenerEntrenador(): Promise<Entrenador | null> {
    const { data } = await supabase.auth.getSession();
    return aEntrenador(data.session);
  },

  async iniciarSesionConGoogle(): Promise<void> {
    const redirectTo = Linking.createURL('/');
    console.log('redirectTo =', redirectTo);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) {
      throw new Error(`No se pudo iniciar sesión: ${error?.message ?? 'sin URL'}`);
    }

    const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    // Si el usuario cierra el navegador, no es un error.
    if (resultado.type !== 'success') return;

    // Supabase devuelve los tokens en el fragmento de la URL (#access_token=...).
    const fragmento = resultado.url.split('#')[1] ?? '';
    const params = new URLSearchParams(fragmento);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) throw new Error('Google no devolvió la sesión');

    const { error: errorSesion } = await supabase.auth.setSession({ access_token, refresh_token });
    if (errorSesion) throw new Error(`No se pudo guardar la sesión: ${errorSesion.message}`);
  },

  async cerrarSesion(): Promise<void> {
    await supabase.auth.signOut();
  },

  // Devuelve la función para dejar de escuchar.
  suscribirse(alCambiar: (entrenador: Entrenador | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_evento, session) => {
      alCambiar(aEntrenador(session));
    });
    return () => data.subscription.unsubscribe();
  },
};