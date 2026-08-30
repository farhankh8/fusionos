'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '72px', fontWeight: 'bold', color: '#DC2626' }}>500</p>
            <h1 style={{ marginTop: '8px', fontSize: '18px', fontWeight: '600', color: '#0F172A' }}>
              Internal Server Error
            </h1>
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#64748B' }}>
              {error.message || 'Something went wrong. Please try again.'}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
