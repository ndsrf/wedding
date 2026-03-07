import Link from 'next/link';
import { ReactNode } from 'react';

interface NavGroupItem {
  href: string;
  label: string;
  icon: ReactNode;
}

interface NavGroupProps {
  title: string;
  headerIcon: ReactNode;
  headerBgClass: string;
  hoverTextClass: string;
  items: NavGroupItem[];
}

export function NavGroup({ title, headerIcon, headerBgClass, hoverTextClass, items }: NavGroupProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-10 h-10 ${headerBgClass} rounded-xl flex items-center justify-center`}>
          {headerIcon}
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="flex flex-col gap-1.5 pl-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-xs text-gray-600 ${hoverTextClass} hover:underline flex items-center gap-1 transition-colors`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
