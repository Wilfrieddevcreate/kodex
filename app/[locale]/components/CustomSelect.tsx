"use client";

import Select, { StylesConfig, GroupBase } from "react-select";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

const customStyles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: state.isFocused ? "#14708E" : "rgba(255, 255, 255, 0.1)",
    borderRadius: "0.75rem",
    padding: "0.15rem 0.25rem",
    minHeight: "44px",
    boxShadow: state.isFocused ? "0 0 0 1px #14708E" : "none",
    cursor: "pointer",
    "&:hover": {
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#111111",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "0.75rem",
    overflow: "hidden",
    zIndex: 50,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
  }),
  menuList: (base) => ({
    ...base,
    padding: "4px",
    maxHeight: "220px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#14708E"
      : state.isFocused
      ? "rgba(20, 112, 142, 0.15)"
      : "transparent",
    color: state.isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
    borderRadius: "0.5rem",
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: "0.875rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "&:active": {
      backgroundColor: "rgba(20, 112, 142, 0.25)",
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: "#ffffff",
    fontSize: "0.875rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }),
  placeholder: (base) => ({
    ...base,
    color: "rgba(255, 255, 255, 0.2)",
    fontSize: "0.875rem",
  }),
  input: (base) => ({
    ...base,
    color: "#ffffff",
    fontSize: "0.875rem",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: "rgba(255, 255, 255, 0.3)",
    transition: "transform 0.2s",
    transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
    "&:hover": {
      color: "rgba(255, 255, 255, 0.5)",
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "rgba(255, 255, 255, 0.3)",
    "&:hover": {
      color: "rgba(255, 255, 255, 0.6)",
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: "0.875rem",
  }),
};

// Custom option with icon
function formatOptionLabel(option: SelectOption) {
  return (
    <div className="flex items-center gap-2">
      {option.icon && <span className="shrink-0">{option.icon}</span>}
      <span>{option.label}</span>
    </div>
  );
}

interface CustomSelectProps {
  options: SelectOption[];
  value?: SelectOption | null;
  defaultValue?: SelectOption;
  onChange?: (option: SelectOption | null) => void;
  placeholder?: string;
  isSearchable?: boolean;
  isClearable?: boolean;
  name?: string;
  required?: boolean;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Select...",
  isSearchable = true,
  isClearable = false,
  name,
  className = "",
}: CustomSelectProps) {
  return (
    <div className={className}>
      <Select
        options={options}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        isSearchable={isSearchable}
        isClearable={isClearable}
        name={name}
        styles={customStyles}
        formatOptionLabel={formatOptionLabel}
        classNamePrefix="kodex-select"
      />
    </div>
  );
}
