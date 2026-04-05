/**
 * Dynamic Message Email Template
 * Generic email template that renders subject and body from database templates
 * Supports any custom content with preserved formatting
 */

import {
  Body,
  Container,
  Head,
  Html as BaseEmailHtml,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { Language } from '../../i18n/config';

interface DynamicMessageEmailProps {
  language: Language;
  subject: string;
  body: string;
  coupleNames?: string;
  imageUrl?: string | null;
}

export const DynamicMessageEmail = ({
  language: _language = 'en',
  subject = 'Important Message',
  body = 'This is an important message from the couple.',
  coupleNames = 'The Couple',
  imageUrl = null,
}: DynamicMessageEmailProps) => {
  console.log('[EMAIL TEMPLATE] Rendering with imageUrl:', imageUrl);

  // Convert simple markdown-like formatting to styled text
  // Supports **bold**, *italic*, and [[link|url]]
  const renderFormattedBody = (content: string) => {
    // Split by double newlines for paragraphs
    const paragraphs = content.split('\n\n');

    return paragraphs.map((paragraph, pIndex) => {
      // Handle inline formatting within paragraph
      const parts: React.ReactNode[] = [];
      let currentText = '';
      let i = 0;

      while (i < paragraph.length) {
        // Check for **bold**
        if (paragraph.substring(i, i + 2) === '**') {
          if (currentText) {
            parts.push(currentText);
            currentText = '';
          }
          i += 2;
          let boldText = '';
          while (i < paragraph.length && paragraph.substring(i, i + 2) !== '**') {
            boldText += paragraph[i];
            i++;
          }
          parts.push(
            <strong key={`bold-${pIndex}-${parts.length}`}>{boldText}</strong>
          );
          i += 2;
        }
        // Check for links in format [[text|url]]
        else if (paragraph.substring(i, i + 2) === '[[') {
          if (currentText) {
            parts.push(currentText);
            currentText = '';
          }
          i += 2;
          let linkPart = '';
          while (i < paragraph.length && paragraph.substring(i, i + 2) !== ']]') {
            linkPart += paragraph[i];
            i++;
          }
          const [linkText, linkUrl] = linkPart.split('|');
          if (linkUrl) {
            parts.push(
              <Link
                key={`link-${pIndex}-${parts.length}`}
                href={linkUrl}
                style={link}
              >
                {linkText}
              </Link>
            );
          } else {
            parts.push(linkText);
          }
          i += 2;
        }
        // Check for http/https URLs
        else if (paragraph.substring(i, i + 7) === 'http://' || paragraph.substring(i, i + 8) === 'https://') {
          if (currentText) {
            parts.push(currentText);
            currentText = '';
          }
          let url = '';
          while (i < paragraph.length && paragraph[i] !== ' ' && paragraph[i] !== '\n') {
            url += paragraph[i];
            i++;
          }
          parts.push(
            <Link key={`auto-link-${pIndex}-${parts.length}`} href={url} style={link}>
              {url}
            </Link>
          );
        } 
        // Handle single newlines within paragraphs
        else if (paragraph[i] === '\n') {
          if (currentText) {
            parts.push(currentText);
            currentText = '';
          }
          parts.push(<br key={`br-${pIndex}-${i}`} />);
          i++;
        }
        else {
          currentText += paragraph[i];
          i++;
        }
      }

      if (currentText) {
        parts.push(currentText);
      }

      return (
        <Text key={pIndex} style={text}>
          {parts}
        </Text>
      );
    });
  };

  return (
    <BaseEmailHtml>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          {imageUrl && (
            <Section style={imageSection}>
              <Img
                src={imageUrl}
                alt="Invitation"
                width="100%"
                style={image}
              />
            </Section>
          )}
          {renderFormattedBody(body)}

          <Section style={footer}>
            <Text style={footerText}>
              {coupleNames}
            </Text>
          </Section>
        </Container>
      </Body>
    </BaseEmailHtml>
  );
};

export default DynamicMessageEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const imageSection = {
  padding: '0',
  margin: '0',
};

const image = {
  display: 'block',
  width: '100%',
  height: 'auto',
  margin: '0 auto',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const link = {
  color: '#5469d4',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  display: 'inline',
};

const footer = {
  borderTop: '1px solid #eaeaea',
  margin: '32px 0 0',
  padding: '24px 40px 0',
};

const footerText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};
