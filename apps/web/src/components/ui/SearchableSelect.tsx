import {
  useState,
  useRef,
  useEffect,
  useMemo,
  Children,
  isValidElement,
  type ReactNode,
  type CSSProperties,
} from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  group?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  options?: SearchableSelectOption[];
  children?: ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  style?: CSSProperties;
  onChange?: (value: string) => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function SearchableSelect({
  name,
  id,
  value,
  defaultValue,
  options: propOptions,
  children,
  placeholder = "-- Pilih Opsi --",
  searchPlaceholder = "Ketik untuk mencari...",
  disabled = false,
  required = false,
  className = "",
  style,
  onChange,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SearchableSelectProps) {
  // Extract options from children if not provided in propOptions
  const parsedOptions = useMemo<SearchableSelectOption[]>(() => {
    if (propOptions && propOptions.length > 0) return propOptions;
    if (!children) return [];

    const extracted: SearchableSelectOption[] = [];
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      const childProps = child.props as any;
      if (child.type === "option") {
        extracted.push({
          value: String(childProps.value ?? ""),
          label: String(childProps.children ?? childProps.value ?? ""),
          disabled: Boolean(childProps.disabled),
        });
      } else if (child.type === "optgroup") {
        const groupLabel = childProps.label || "";
        Children.forEach(childProps.children, (subChild) => {
          if (isValidElement(subChild) && subChild.type === "option") {
            const subProps = subChild.props as any;
            extracted.push({
              value: String(subProps.value ?? ""),
              label: String(subProps.children ?? subProps.value ?? ""),
              group: groupLabel,
              disabled: Boolean(subProps.disabled),
            });
          }
        });
      }
    });
    return extracted;
  }, [propOptions, children]);

  const isControlled = value !== undefined;
  const [internalVal, setInternalVal] = useState<string>(
    value ?? defaultValue ?? ""
  );

  useEffect(() => {
    if (isControlled) {
      setInternalVal(value ?? "");
    }
  }, [isControlled, value]);

  const selectedValue = isControlled ? (value ?? "") : internalVal;

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hiddenSelectRef = useRef<HTMLSelectElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parsedOptions;
    return parsedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.group && opt.group.toLowerCase().includes(q))
    );
  }, [parsedOptions, search]);

  const selectedOption = useMemo(
    () => parsedOptions.find((opt) => opt.value === selectedValue),
    [parsedOptions, selectedValue]
  );

  const handleSelect = (val: string) => {
    if (!isControlled) setInternalVal(val);
    onChange?.(val);

    // Update hidden select for form integration
    if (hiddenSelectRef.current) {
      hiddenSelectRef.current.value = val;
      hiddenSelectRef.current.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    }

    setIsOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearch("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredOptions[highlightedIndex];
      if (current && !current.disabled) {
        handleSelect(current.value);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-root ${className}`.trim()}
      style={{
        position: "relative",
        width: "100%",
        display: "inline-block",
        ...style,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden Native Select for FormData and Accessibility */}
      <select
        ref={hiddenSelectRef}
        name={name}
        id={id}
        value={selectedValue}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => handleSelect(e.target.value)}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          top: 0,
          left: 0,
        }}
      >
        <option value="">{placeholder}</option>
        {parsedOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 12px",
          background: "var(--surface, #ffffff)",
          color: selectedOption
            ? "var(--foreground, #0f172a)"
            : "var(--muted, #64748b)",
          border: `1px solid ${
            isOpen ? "var(--adaptive-primary, #2563eb)" : "var(--border, #cbd5e1)"
          }`,
          borderRadius: 6,
          fontSize: "0.92rem",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          outline: "none",
          boxShadow: isOpen
            ? "0 0 0 2px var(--focus-ring, rgba(37, 99, 235, 0.2))"
            : "none",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          minHeight: 38,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: "var(--muted, #64748b)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, #cbd5e1)",
            borderRadius: 8,
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search Box Header */}
          <div
            style={{
              padding: "8px 10px",
              borderBottom: "1px solid var(--border, #e2e8f0)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface-subtle, rgba(0, 0, 0, 0.02))",
            }}
          >
            <Search
              size={15}
              style={{ color: "var(--muted, #64748b)", flexShrink: 0 }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              placeholder={searchPlaceholder}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "0.88rem",
                color: "var(--foreground, #0f172a)",
                padding: "2px 0",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  searchInputRef.current?.focus();
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 2,
                  cursor: "pointer",
                  color: "var(--muted, #64748b)",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            style={{
              maxHeight: 250,
              overflowY: "auto",
              padding: "4px 0",
            }}
          >
            {/* Optional Empty / Reset option */}
            {!required && (
              <div
                role="option"
                aria-selected={!selectedValue}
                onClick={() => handleSelect("")}
                style={{
                  padding: "7px 12px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  color: "var(--muted, #64748b)",
                  borderBottom: "1px dashed var(--border, #e2e8f0)",
                  marginBottom: 2,
                }}
              >
                <em>{placeholder}</em>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "16px 12px",
                  textAlign: "center",
                  color: "var(--muted, #64748b)",
                  fontSize: "0.85rem",
                }}
              >
                Tidak ada pilihan yang cocok.
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === selectedValue;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) handleSelect(opt.value);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      padding: "8px 12px",
                      fontSize: "0.88rem",
                      cursor: opt.disabled ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      opacity: opt.disabled ? 0.5 : 1,
                      background: isHighlighted
                        ? "var(--surface-active, rgba(37, 99, 235, 0.08))"
                        : isSelected
                        ? "var(--surface-selected, rgba(37, 99, 235, 0.04))"
                        : "transparent",
                      color: isSelected
                        ? "var(--adaptive-primary, #2563eb)"
                        : "var(--foreground, #0f172a)",
                      fontWeight: isSelected ? 600 : 400,
                      transition: "background 0.1s ease",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {opt.label}
                      </div>
                      {opt.sublabel && (
                        <small
                          style={{
                            display: "block",
                            fontSize: "0.78rem",
                            color: "var(--muted, #64748b)",
                          }}
                        >
                          {opt.sublabel}
                        </small>
                      )}
                    </div>
                    {isSelected && (
                      <Check
                        size={15}
                        style={{
                          color: "var(--adaptive-primary, #2563eb)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
