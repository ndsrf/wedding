'use client';

import { useState } from 'react';
import TrialSignupModal from './TrialSignupModal';

interface TrialSignupButtonProps {
  label: string;
  locale: string;
  className?: string;
}

export default function TrialSignupButton({ label, locale, className }: TrialSignupButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className}
        type="button"
      >
        {label}
      </button>
      {isOpen && (
        <TrialSignupModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          locale={locale}
        />
      )}
    </>
  );
}
