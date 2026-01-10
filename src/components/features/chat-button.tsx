'use client';

import { MessageCircle } from 'lucide-react';
import { useAnalytics } from '@/hooks/use-analytics';

interface ChatButtonProps {
  href: string;
  modelId: string;
  modelName: string;
  variant?: 'fixed' | 'inline';
  label?: string;
}

export function ChatButton({ href, modelId, modelName, variant = 'fixed', label }: ChatButtonProps) {
  const { trackClick } = useAnalytics();

  const handleClick = async () => {
    await trackClick(modelId, 'social');
  };

  // Render label exactly as passed (parent page constructs full string)
  // Fallback to constructed text only if label is not provided
  const buttonText = label ?? `Chat with ${modelName}`;

  // Glass-Gold Luxury Style: Midnight solid with gold accent border and subtle glow animation
  const buttonClasses = `
    w-full h-14 text-lg font-semibold rounded-full 
    bg-primary text-primary-foreground
    border border-primary/40
    animate-glow
    hover:bg-primary/90
    active:scale-[0.98]
    transition-all duration-200 ease-out
    flex items-center justify-center
  `.trim().replace(/\s+/g, ' ');

  if (variant === 'inline') {
    return (
      <a
        id="chat-button"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={buttonClasses}
      >
        {buttonText}
        <MessageCircle className="w-5 h-5 ml-2" />
      </a>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/60 backdrop-blur-2xl border-t border-white/15 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-50">
      <a
        id="chat-button"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={buttonClasses}
      >
        {buttonText}
        <MessageCircle className="w-5 h-5 ml-2" />
      </a>
    </div>
  );
}

