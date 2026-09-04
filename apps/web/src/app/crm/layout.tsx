'use client';

import React from 'react';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#FBF5EC]">
      {children}
    </div>
  );
}
