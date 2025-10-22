"use client";

import { useEffect, useState } from "react";
import { getRateLimitStatus } from "../utils/validation";

export function RateLimitIndicator() {
  const [remaining, setRemaining] = useState(10);
  const [total] = useState(10);

  useEffect(() => {
    const updateRemaining = () => {
      const status = getRateLimitStatus();
      setRemaining(status.remaining);
    };

    // Actualizar inmediatamente
    updateRemaining();

    // Actualizar cada segundo
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, []);

  const getColor = () => {
    if (remaining >= 7) return "text-green-600";
    if (remaining >= 4) return "text-yellow-600";
    return "text-red-600";
  };

  const getIcon = () => {
    if (remaining >= 7) return "✅";
    if (remaining >= 4) return "⚠️";
    return "🚫";
  };

  const getBackgroundColor = () => {
    if (remaining >= 7) return "bg-green-50";
    if (remaining >= 4) return "bg-yellow-50";
    return "bg-red-50";
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getBackgroundColor()} transition-colors`}>
      <span className={`font-medium text-sm ${getColor()}`}>
        {getIcon()} {remaining}/{total} mensajes
      </span>
      {remaining < 4 && (
        <span className="text-xs text-gray-500">
          (Espera 60s)
        </span>
      )}
    </div>
  );
}
