'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import type { TemplateBlock, TemplateDesign, SupportedLanguage, TextBlock, ImageBlock, LocationBlock as LocationBlockType, CountdownBlock as CountdownBlockType } from '@/types/invitation-template';
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

  // Find first image block index for priority loading
  const firstImageIndex = useMemo(() => {
    if (!templateDesign?.blocks) return -1;
    return templateDesign.blocks.findIndex((block) => block.type === 'image');
  }, [templateDesign]);

  if (!templateDesign || !templateDesign.blocks) {
    return null;
  }

  return (
    <div
      className="w-full relative min-h-screen"
      style={{
        backgroundColor: templateDesign.globalStyle.backgroundColor,
      }}
    >
      {/* Paper Background Image (user-uploaded) */}
      {templateDesign.globalStyle.paperBackgroundImage && (
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src={templateDesign.globalStyle.paperBackgroundImage}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
            quality={90}
            unoptimized
          />
        </div>
      )}

      {/* Theme Background Image */}
      {templateDesign.globalStyle.backgroundImage && (
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <Image
            src={templateDesign.globalStyle.backgroundImage}
            alt=""
            fill
            priority={!templateDesign.globalStyle.paperBackgroundImage}
            className="object-cover"
            sizes="100vw"
            quality={75}
            unoptimized
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 space-y-6">
        {templateDesign.blocks.map((block, index) => (
          <TemplateBlock
            key={block.id}
            block={block}
            weddingDate={weddingDate}
            weddingTime={weddingTime}
            location={location}
            coupleNames={coupleNames}
            language={language}
            isPriorityImage={index === firstImageIndex}
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
  isPriorityImage?: boolean;
}

function TemplateBlock({
  block,
  weddingDate,
  weddingTime,
  location,
  coupleNames,
  language,
  isPriorityImage = false,
}: TemplateBlockProps) {
  if (block.type === 'text') {
    const textBlock = block as TextBlock;
    const textContent = textBlock.content[language] || textBlock.content['EN'] || '';
    return (
      <div style={{ ...textBlock.style, whiteSpace: 'pre-line' }} className="text-center">
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
          priority={isPriorityImage}
          unoptimized
        />
      </div>
    );
  }

  if (block.type === 'location') {
    const locationBlock = block as LocationBlockType;
    return (
      <LocationBlock
        location={location}
        weddingTime={weddingTime}
        style={locationBlock.style}
      />
    );
  }

  if (block.type === 'countdown') {
    const countdownBlock = block as CountdownBlockType;
    return (
      <CountdownBlock
        weddingDate={weddingDate}
        weddingTime={weddingTime}
        style={countdownBlock.style}
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
