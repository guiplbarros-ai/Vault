"use client";

import * as React from "react";
import { TagBadge } from "./tag-badge";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { Tag } from "@/lib/types";

export interface TagInputProps {
  tags: string[];
  availableTags?: Tag[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  maxTags?: number;
}

export function TagInput({
  tags,
  availableTags = [],
  onChange,
  placeholder = "Adicionar tag...",
  className,
  maxTags,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  // Filtrar sugestões baseado no input
  React.useEffect(() => {
    if (inputValue.trim()) {
      const filtered = availableTags.filter(
        (tag) =>
          tag.nome.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(tag.nome)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, availableTags, tags]);

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (trimmed && !tags.includes(trimmed)) {
      if (maxTags && tags.length >= maxTags) {
        return;
      }
      onChange([...tags, trimmed]);
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        addTag(suggestions[selectedIndex].nome);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "ArrowDown" && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp" && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setInputValue("");
    }
  };

  const getTagColor = (tagName: string): string | undefined => {
    const tag = availableTags.find((t) => t.nome === tagName);
    return tag?.cor;
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex flex-wrap gap-2 p-2 border rounded-md !bg-[#1e293b] !border-white/20",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "min-h-[42px]"
        )}
        style={{
          backgroundColor: '#1e293b',
          borderColor: 'rgba(255, 255, 255, 0.2)'
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <TagBadge
            key={tag}
            label={tag}
            cor={getTagColor(tag)}
            onRemove={() => removeTag(tag)}
            size="sm"
          />
        ))}
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim() && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Delay para permitir clique nas sugestões
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-6 min-w-[120px] !bg-transparent !text-white placeholder:!text-white/50"
          style={{
            backgroundColor: 'transparent',
            color: '#ffffff'
          }}
        />
      </div>

      {/* Sugestões */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 !bg-gray-800 !border-gray-700 border rounded-md shadow-md max-h-60 overflow-auto"
          style={{
            backgroundColor: '#1f2937',
            borderColor: '#374151'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => addTag(suggestion.nome)}
              className={cn(
                "w-full text-left px-3 py-2 !text-white hover:!bg-gray-700 transition-colors",
                "flex items-center gap-2",
                selectedIndex === index && "!bg-gray-700"
              )}
              style={{ color: '#ffffff' }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: suggestion.cor || "#2d9b9b" }}
              />
              <span className="flex-1">{suggestion.nome}</span>
              {suggestion.tipo === "sistema" && (
                <span className="text-xs text-white/70">Sistema</span>
              )}
            </button>
          ))}
        </div>
      )}

      {maxTags && (
        <p className="text-xs text-white/70 mt-1">
          {tags.length}/{maxTags} tags
        </p>
      )}
    </div>
  );
}
