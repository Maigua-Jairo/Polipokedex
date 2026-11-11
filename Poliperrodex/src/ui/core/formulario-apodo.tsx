import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApodo } from './apodo-view-model';
import { Boton } from './boton';
import { colores, espacio } from './tema';
import { Texto } from './texto';

// Vista: solo pide una acción al ViewModel y muestra el resultado.
// No sabe nada de Google ni de Supabase.
export function FormularioApodo() {
  const { iniciarSesion } = useApodo();
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar() {
    setEntrando(true);
    setError(null);
    try {
      await iniciarSesion();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido al iniciar sesión');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <View style={estilos.caja}>
      <Texto variante="subtitulo">Entra para empezar a capturar</Texto>
      <Texto variante="nota">
        Tu nombre de Google será tu apodo. Cada captura queda a tu nombre y
        solo tú puedes registrar las tuyas.
      </Texto>
      {error && <Texto style={{ color: colores.alerta }}>{error}</Texto>}
      <Boton
        titulo={entrando ? 'Entrando…' : 'Entrar con Google'}
        onPress={entrar}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: espacio.m, padding: espacio.l },
});