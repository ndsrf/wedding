'use client';

import { useState } from 'react';

type Persona = 'planner' | 'couple' | 'guest';

interface PersonaTab {
  key: Persona;
  label: string;
  description: string;
  icon: React.ReactNode;
  activeClass: string;
}

interface DocsPersonaTabsProps {
  tabs: PersonaTab[];
  plannerContent: React.ReactNode;
  coupleContent: React.ReactNode;
  guestContent: React.ReactNode;
}

export default function DocsPersonaTabs({
  tabs,
  plannerContent,
  coupleContent,
  guestContent,
}: DocsPersonaTabsProps) {
  const [active, setActive] = useState<Persona>('planner');

  const content: Record<Persona, React.ReactNode> = {
    planner: plannerContent,
    couple: coupleContent,
    guest: guestContent,
  };

  const activeTab = tabs.find((t) => t.key === active)!;

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
              active === tab.key
                ? `${tab.activeClass} text-white shadow-md scale-105`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="w-4 h-4">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active persona description */}
      <p className="text-gray-600 mb-6 text-sm leading-relaxed border-l-4 border-rose-200 pl-4 italic">
        {activeTab.description}
      </p>

      {/* Feature cards grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {content[active]}
      </div>
    </div>
  );
}
