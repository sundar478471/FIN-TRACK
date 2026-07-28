import React from 'react';
import * as Lucide from 'lucide-react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, className = '', color }) => {
  // Simple check for PascalCase/camelCase conversion if needed
  let resolvedName = name;
  if (name && !Lucide[name as keyof typeof Lucide]) {
    // Attempt capitalize first letter e.g., "briefcase" -> "Briefcase"
    resolvedName = name.charAt(0).toUpperCase() + name.slice(1);
  }

  const LucideIcon = Lucide[resolvedName as keyof typeof Lucide] as React.ComponentType<any>;
  if (!LucideIcon) {
    // Fallback default icon
    return <Lucide.HelpCircle size={size} className={className} color={color} />;
  }
  
  return <LucideIcon size={size} className={className} color={color} />;
};
