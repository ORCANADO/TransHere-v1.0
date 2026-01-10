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

  const buttonClasses = "w-full h-14 text-lg font-bold rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 transition-all animate-pulse flex items-center justify-center";

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
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t z-50">
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

