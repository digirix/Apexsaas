import React from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface APIConnectionStatusProps {
  status: "connected" | "disconnected" | "loading" | "error";
  className?: string;
  label?: string;
  message?: string;
}

export function APIConnectionStatus({
  status,
  className,
  label,
  message
}: APIConnectionStatusProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {status === "connected" && (
        <CheckCircle className="h-4 w-4 text-green-500" />
      )}
      {status === "disconnected" && (
        <AlertCircle className="h-4 w-4 text-amber-500" />
      )}
      {status === "error" && (
        <AlertCircle className="h-4 w-4 text-red-500" />
      )}
      {status === "loading" && (
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      )}
      
      <div className="flex flex-col">
        <span
          className={cn(
            "text-xs font-medium",
            status === "connected" && "text-green-600",
            status === "disconnected" && "text-amber-600",
            status === "error" && "text-red-600",
            status === "loading" && "text-blue-600"
          )}
        >
          {label || (
            status === "connected"
              ? "Connected"
              : status === "disconnected"
              ? "Not Connected"
              : status === "error"
              ? "Error"
              : "Connecting..."
          )}
        </span>
        {message && (
          <span className="text-xs text-slate-500">{message}</span>
        )}
      </div>
    </div>
  );
}