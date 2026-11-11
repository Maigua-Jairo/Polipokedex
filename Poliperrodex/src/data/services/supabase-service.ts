import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { env } from './env';

// Service: envuelve una fuente de datos externa y nada más.
// Cambio del reto: ahora la sesión sobrevive a reinicios de la app.
export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    storage: AsyncStorage,      // dónde se guarda la sesión en el teléfono
    persistSession: true,       // antes era false: no había sesión que guardar
    autoRefreshToken: true,     // renueva el token antes de que expire
    detectSessionInUrl: false,  // lo manejamos nosotros con WebBrowser
  },
});

export function urlPublica(ruta: string): string {
  return supabase.storage.from(env.bucket).getPublicUrl(ruta).data.publicUrl;
}

export async function subirImagen(ruta: string, bytes: ArrayBuffer): Promise<void> {
  const { error } = await supabase.storage
    .from(env.bucket)
    .upload(ruta, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
}