import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';

export function LoginScreen() {
  const { login, error, loading } = useAuth();
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || submitting) return;
    setSubmitting(true);
    await login(pin.trim());
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', background: '#F5F1E8',
        fontFamily: 'Nunito, sans-serif', color: '#1C1C1C',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #C9A24A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 14, color: '#8A7A60' }}>Verificando sesión…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: '#F5F1E8',
      fontFamily: 'Nunito, sans-serif', padding: 20,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#FFFFFF', borderRadius: 16, padding: '40px 36px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: 24, fontWeight: 900,
            color: '#C9A24A', letterSpacing: 4, marginBottom: 4,
          }}>
            LEMGIL
          </div>
          <div style={{
            fontSize: 10, color: '#8A7A60', letterSpacing: 2.5,
            textTransform: 'uppercase',
          }}>
            Ministerio Apostólico
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 700,
            color: '#4A3F2F', marginBottom: 6, letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            PIN de acceso
          </label>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Ingresa el PIN"
            autoFocus
            style={{
              width: '100%', padding: '12px 14px', fontSize: 15,
              border: error ? '1.5px solid #B04040' : '1.5px solid rgba(201,162,74,0.25)',
              borderRadius: 8, outline: 'none',
              background: '#FAF7F0', color: '#1C1C1C',
              fontFamily: 'Nunito, sans-serif',
            }}
          />
          {error && (
            <p style={{ color: '#B04040', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !pin.trim()}
          style={{
            width: '100%', padding: '12px', fontSize: 14, fontWeight: 700,
            background: submitting ? '#8A7A60' : '#C9A24A',
            color: '#FFFFFF', border: 'none', borderRadius: 8,
            cursor: submitting || !pin.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'Nunito, sans-serif', letterSpacing: 1,
          }}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
