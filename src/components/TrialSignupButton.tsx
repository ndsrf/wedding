'use client';

import { useState } from 'react';
import TrialSignupModal from './TrialSignupModal';

interface TrialSignupButtonProps {
  label?: string;
  locale: string;
  className?: string;
  children?: React.ReactNode;
}

export default function TrialSignupButton({ label, locale, className, children }: TrialSignupButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className}
        type="button"
      >
        {children || label}
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
