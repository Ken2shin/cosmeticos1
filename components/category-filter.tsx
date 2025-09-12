"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface Category {
  id: number
  name: string
}

interface CategoryFilterProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      console.log("[v0] Fetching categories from client side...")
      const response = await fetch("/api/categories")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Categories fetched successfully:", data)
      setCategories(data || [])
    } catch (error) {
      console.error("[v0] Error fetching categories:", error)
      setCategories([
        { id: 1, name: "labial" },
        { id: 2, name: "marbellin" },
      ])
    }
  }

  const handleCategoryChange = (category: string) => {
    console.log("[v0] Category changed to:", category)
    if (typeof onCategoryChange === "function") {
      onCategoryChange(category)
    }
  }

  console.log("[v0] CategoryFilter state:", { selectedCategory, categoriesCount: categories.length })

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-8">
      <Button
        variant={selectedCategory === "all" ? "default" : "outline"}
        onClick={() => handleCategoryChange("all")}
        size="sm"
        className="transition-all duration-200 hover:scale-105"
      >
        Todos
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.name ? "default" : "outline"}
          onClick={() => handleCategoryChange(category.name)}
          size="sm"
          className="transition-all duration-200 hover:scale-105"
        >
          {category.name}
        </Button>
      ))}
    </div>
  )
}
