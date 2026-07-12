"use client";

// english-gym-admin 由来の useToast API を PrepMaster の sonner に橋渡しするシム。
// 移植元は `toast({ title, description, variant })` の形で呼ぶので、
// それを sonner の toast へマッピングする。
import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "destructive";

type ToastArgs = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastArgs) => {
    const message = title ?? description ?? "";
    if (variant === "destructive") {
      sonnerToast.error(message, description && title ? { description } : undefined);
    } else {
      sonnerToast.success(message, description && title ? { description } : undefined);
    }
  };
  return { toast };
}
