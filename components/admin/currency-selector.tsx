"use client"

import { useState, useEffect, useCallback } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Currency {
  code: string
  name: string
  symbol: string
  flag_emoji: string
}

interface CurrencySelectorProps {
  value: string
  onValueChange: (value: string) => void
}

const DEFAULT_CURRENCIES: Currency[] = [{ code: "NIO", name: "Córdoba Nicaragüense", symbol: "C$", flag_emoji: "🇳🇮" }]

export function CurrencySelector({ value, onValueChange }: CurrencySelectorProps) {
  const [currencies] = useState<Currency[]>(DEFAULT_CURRENCIES)
  const [loading] = useState(false)

  const handleValueChange = useCallback(
    (newValue: string) => {
      if (newValue !== value) {
        onValueChange(newValue)
      }
    },
    [value, onValueChange],
  )

  useEffect(() => {
    if (!value) {
      onValueChange("NIO")
    }
  }, []) // Removed dependencies to prevent infinite loop

  return (
    <Select value={value || "NIO"} onValueChange={handleValueChange} disabled={loading}>
      <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-rose-500">
        <SelectValue placeholder="Córdoba Nicaragüense (C$)" />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{currency.flag_emoji}</span>
              <span>
                {currency.symbol} - {currency.name}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
