'use client';

export function ArcadeEmbed() {
  return (
    <div style={{ position: 'relative', paddingBottom: 'calc(52.734375% + 41px)', height: '0', width: '100%' }}>
      <iframe
        src="https://demo.arcade.software/9ms6x5NLkRu5zSdhR3h9?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
        title="El Panel de la Pareja"
        loading="lazy"
        allowFullScreen
        allow="clipboard-write"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', colorScheme: 'light', border: 0 }}
      />
    </div>
  )
}
