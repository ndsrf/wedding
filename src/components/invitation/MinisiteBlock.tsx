'use client';

import { useEffect, useRef, useState } from 'react';

interface MinisiteBlockProps {
  folderName: string;
  language?: string;
}

/**
 * MinisiteBlock - Renders a self-contained static HTML minisite in an iframe.
 * Dynamically adjusts its height to fit the content without showing scrollbars.
 * Detects initial screen overlays (gatekeepers) and overrides viewport height (vh)
 * styles to prevent infinite resizing loops.
 *
 * @component
 */
export function MinisiteBlock({ folderName, language }: MinisiteBlockProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<string>('700px'); // Reasonable height for gatekeeper

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Helper to inject CSS overrides to prevent viewport height loop when opened
    const injectStyles = (doc: Document) => {
      const styleId = 'nupci-minisite-overrides';
      if (doc.getElementById(styleId)) return;

      const style = doc.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Break viewport-relative height loops when iframe is expanded */
        .min-h-screen, [class*="min-h-screen"] {
          min-height: 650px !important;
        }
        .h-screen, [class*="h-screen"] {
          height: 650px !important;
        }
        html, body {
          height: auto !important;
          min-height: 0 !important;
        }
      `;
      doc.head.appendChild(style);
    };

    const updateHeight = () => {
      try {
        if (iframe.contentWindow && iframe.contentWindow.document) {
          const doc = iframe.contentWindow.document;

          // Check if the gatekeeper button is still visible/present in the DOM
          const gatekeeperBtn = 
            doc.querySelector('button[aria-label="Abrir la invitación"]') || 
            doc.querySelector('button[aria-label="Open the invitation"]') ||
            doc.querySelector('button[class*="fixed"][class*="inset-0"]');

          if (gatekeeperBtn) {
            // Keep a clean fixed height for the gatekeeper screen
            setHeight('700px');

            // Attach a click listener to the gatekeeper button to trigger resize immediately after click
            if (gatekeeperBtn.getAttribute('data-nupci-listener') !== 'true') {
              gatekeeperBtn.setAttribute('data-nupci-listener', 'true');
              gatekeeperBtn.addEventListener('click', () => {
                setTimeout(() => {
                  updateHeight();
                }, 150); // Small delay to let transitions/hiding start
              });
            }
            return;
          }

          // If we reach here, the invitation is opened
          injectStyles(doc);

          const body = doc.body;
          const html = doc.documentElement;

          // Compute maximum of scroll and offset heights to ensure no scrollbars
          const newHeight = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
          );

          if (newHeight > 0) {
            setHeight(`${newHeight}px`);
          }
        }
      } catch (e) {
        // Log errors but do not crash (e.g. local setup origin policies)
        console.warn('Failed to dynamically adjust minisite iframe height:', e);
      }
    };

    // Listen for iframe load
    iframe.addEventListener('load', updateHeight);

    // Watch for internal mutations in same-origin document body
    let observer: MutationObserver | null = null;
    try {
      if (iframe.contentWindow && iframe.contentWindow.document) {
        observer = new MutationObserver(updateHeight);
        observer.observe(iframe.contentWindow.document.body, {
          attributes: true,
          childList: true,
          subtree: true,
        });
      }
    } catch (_e) {
      // Ignore errors if iframe content is not ready yet
    }

    // Interval fallback to check for status changes and dynamically loaded images/fonts
    const intervalId = setInterval(updateHeight, 500);

    // Watch window resize to recalculate responsive layout inside iframe
    window.addEventListener('resize', updateHeight);

    return () => {
      iframe.removeEventListener('load', updateHeight);
      if (observer) {
        observer.disconnect();
      }
      clearInterval(intervalId);
      window.removeEventListener('resize', updateHeight);
    };
  }, [folderName]);

  if (!folderName) {
    return (
      <div className="p-8 border border-dashed border-gray-300 rounded text-center text-gray-500 bg-gray-50">
        Nupci Minisite Block (No folder configured)
      </div>
    );
  }

  const iframeSrc = `/invitation/${folderName}/index.html${language ? `?lang=${language.toLowerCase()}` : ''}`;

  return (
    <div className="w-full relative overflow-hidden">
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        style={{
          width: '100%',
          height: height,
          border: 'none',
          overflow: 'hidden',
          transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth animation when transitioning open
        }}
        scrolling="no"
        title={`Nupci Minisite - ${folderName}`}
      />
    </div>
  );
}
