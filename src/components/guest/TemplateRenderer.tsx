'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import type { TemplateBlock, TemplateDesign, SupportedLanguage, TextBlock, ImageBlock } from '@/types/invitation-template';
import { CountdownBlock } from '@/components/invitation/CountdownBlock';
import { LocationBlock } from '@/components/invitation/LocationBlock';
import { AddToCalendarBlock } from '@/components/invitation/AddToCalendarBlock';

interface TemplateRendererProps {
  design: unknown; // TemplateDesign (stored as JSON)
  weddingDate: string;
  weddingTime: string;
  location: string;
  coupleNames: string;
  language: SupportedLanguage;
}

export default function TemplateRenderer({
  design,
  weddingDate,
  weddingTime,
  location,
  coupleNames,
  language,
}: TemplateRendererProps) {
  const templateDesign = useMemo(() => {
    if (!design || typeof design !== 'object') return null;
    return design as TemplateDesign;
  }, [design]);

  if (!templateDesign || !templateDesign.blocks) {
    return null;
  }

  return (
    <div
      className="w-full"
      style={{
        backgroundColor: templateDesign.globalStyle.backgroundColor,
        backgroundImage: templateDesign.globalStyle.backgroundImage
          ? `url(${templateDesign.globalStyle.backgroundImage})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {templateDesign.blocks.map((block) => (
          <TemplateBlock
            key={block.id}
            block={block}
            weddingDate={weddingDate}
            weddingTime={weddingTime}
            location={location}
            coupleNames={coupleNames}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}

interface TemplateBlockProps {
  block: TemplateBlock;
  weddingDate: string;
  weddingTime: string;
  location: string;
  coupleNames: string;
  language: SupportedLanguage;
}

function TemplateBlock({
  block,
  weddingDate,
  weddingTime,
  location,
  coupleNames,
  language,
}: TemplateBlockProps) {
  if (block.type === 'text') {
    const textBlock = block as TextBlock;
    const textContent = textBlock.content[language] || textBlock.content['EN'] || '';
    return (
      <div style={textBlock.style} className="text-center">
        {textContent}
      </div>
    );
  }

  if (block.type === 'image') {
    const imageBlock = block as ImageBlock;
    return (
      <div className="flex justify-center">
        <Image
          src={imageBlock.src}
          alt={imageBlock.alt}
          width={0}
          height={0}
          sizes="100vw"
          className="max-w-full rounded-lg"
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
    );
  }

  if (block.type === 'location') {
    return (
      <LocationBlock
        location={location}
        weddingTime={weddingTime}
      />
    );
  }

  if (block.type === 'countdown') {
    return (
      <CountdownBlock
        weddingDate={weddingDate}
        weddingTime={weddingTime}
      />
    );
  }

  if (block.type === 'add-to-calendar') {
    return (
      <AddToCalendarBlock
        title={`${coupleNames}'s Wedding`}
        date={weddingDate}
        time={weddingTime}
        location={location}
        description={`You are invited to ${coupleNames}'s wedding`}
      />
    );
  }

  return null;
}
