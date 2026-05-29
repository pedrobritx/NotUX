interface Props<T extends string> {
  options: readonly T[];
  value: T;
  onChange(value: T): void;
  className?: string;
}

/** iOS-style segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: Props<T>) {
  return (
    <div
      className={"segmented" + (className ? ` ${className}` : "")}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="tab"
          aria-selected={opt === value}
          className={
            "segmented__option" +
            (opt === value ? " segmented__option--active" : "")
          }
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
