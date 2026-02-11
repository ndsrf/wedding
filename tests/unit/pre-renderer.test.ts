
import { preRenderTemplate } from '@/lib/invitation-template/pre-renderer';
import { TemplateDesign } from '@/types/invitation-template';

describe('Invitation Template Pre-renderer', () => {
  const mockDesign: TemplateDesign = {
    globalStyle: {
      backgroundColor: '#FFFFFF',
      backgroundImage: '/images/bg.png',
    },
    blocks: [
      {
        id: '1',
        type: 'text',
        content: {
          ES: '¡Nos casamos!',
          EN: "We're getting married!",
          FR: 'Nous nous marions !',
          IT: 'Ci sposiamo!',
          DE: 'Wir heiraten!',
        },
        style: {
          fontFamily: 'Playfair Display',
          fontSize: '2rem',
          color: '#000000',
          textAlign: 'center',
        },
      },
      {
        id: '2',
        type: 'image',
        src: '/images/couple.jpg',
        alt: 'The Couple',
        zoom: 100,
        alignment: 'center',
      },
      {
        id: '3',
        type: 'countdown',
        style: {
          color: '#D4AF37',
        },
      },
    ],
  };

  it('should render HTML for all supported languages', () => {
    const result = preRenderTemplate(mockDesign);

    expect(Object.keys(result)).toEqual(['ES', 'EN', 'FR', 'IT', 'DE']);
    expect(result.ES['1']).toContain('¡Nos casamos!');
    expect(result.EN['1']).toContain("We're getting married!");
    expect(result.DE['1']).toContain('Wir heiraten!');
  });

  it('should include block styles and images', () => {
    const result = preRenderTemplate(mockDesign);
    const textHtml = result.EN['1'];
    const imageHtml = result.EN['2'];

    expect(textHtml).toContain('font-family:Playfair Display');
    expect(imageHtml).toContain('src="/images/couple.jpg"');
    expect(imageHtml).toContain('alt="The Couple"');
  });

  it('should NOT create pre-rendered HTML for interactive blocks', () => {
    const result = preRenderTemplate(mockDesign);
    
    // Countdown block ID is '3'
    expect(result.EN['3']).toBeUndefined();
  });

  it('should apply text styles correctly', () => {
    const result = preRenderTemplate(mockDesign);
    const html = result.EN['1'];

    expect(html).toContain('font-family:Playfair Display');
    expect(html).toContain('font-size:2rem');
    expect(html).toContain('color:#000000');
    expect(html).toContain('text-align:center');
    expect(html).toContain('padding:0 1rem');
  });
});
