import { toast as sonnerToast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const toast = ({ title, description, variant, action }: ToastProps) => {
    const message = description || title || '';
    const toastTitle = title && description ? title : undefined;

    if (variant === 'destructive') {
      sonnerToast.error(message, {
        description: toastTitle,
        action: action ? {
          label: action.label,
          onClick: action.onClick,
        } : undefined,
      });
    } else {
      sonnerToast.success(message, {
        description: toastTitle,
        action: action ? {
          label: action.label,
          onClick: action.onClick,
        } : undefined,
      });
    }
  };

  return { toast };
}
