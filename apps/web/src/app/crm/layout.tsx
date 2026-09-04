'use client';

import React from 'react';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#F8FAFC]">
      {children}
    </div>
  );
}
