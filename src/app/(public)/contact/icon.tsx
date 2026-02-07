import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
          <circle cx="24" cy="32" r="14" stroke="#D97D7D" strokeWidth="5" fill="none"/>
          <circle cx="40" cy="32" r="14" stroke="#C98686" strokeWidth="5" fill="none"/>
        </svg>
      </div>
    ),
    { ...size }
  );
}
