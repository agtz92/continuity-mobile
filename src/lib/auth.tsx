import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAuthRetryableFetchError, type Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { onReconnect } from "./network";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // `true` mientras la sesión en uso es la guardada en disco porque el
    // refresh del token falló por red (ver `resolveSession`).
    let usingStored = false;
    let cancelled = false;

    const resolveSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session && error && isAuthRetryableFetchError(error)) {
        // Sin red y con el access token vencido, Supabase responde "sin
        // sesión" aunque la tenga guardada (y no la borra: el error es
        // reintentable). Tratarlo como cierre de sesión mandaría a login a
        // quien solo está offline. Se usa la guardada — basta para elegir la
        // caché persistida del usuario — y al volver la red se refresca.
        const stored = await readStoredSession();
        if (cancelled) return;
        usingStored = !!stored;
        setSession(stored);
      } else {
        usingStored = false;
        setSession(data.session);
      }
      setLoading(false);
    };

    void resolveSession();
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // La sesión inicial la decide `resolveSession` (que sabe distinguir
      // "offline" de "no hay sesión"); INITIAL_SESSION llegaría con null.
      if (event === "INITIAL_SESSION") return;
      usingStored = false;
      setSession(next);
      setLoading(false);
      // Import tardío: signOut.ts trae Apollo, que no debe cargar antes que la sesión.
      if (event === "SIGNED_OUT") {
        void import("./signOut").then((m) => m.clearUserData());
      }
    });
    const offReconnect = onReconnect(() => {
      if (usingStored) void resolveSession();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      offReconnect();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/** La sesión tal como Supabase la dejó en AsyncStorage, sin validar. */
async function readStoredSession(): Promise<Session | null> {
  try {
    const key = (supabase.auth as unknown as { storageKey: string }).storageKey;
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    return parsed?.user?.id ? parsed : null;
  } catch {
    return null;
  }
}
