// A group of real radio inputs shown as pills. The browser handles the keyboard
// (Tab into the group, arrow keys move and select) and the <legend> is read out as the group's name.

type Option<T extends string> = { value: T; label: string; hint: string };

type Props<T extends string> = {
  name: string;
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export default function PillGroup<T extends string>({ name, legend, options, value, onChange }: Props<T>) {
  return (
    <fieldset className="min-w-0">
      <legend className="font-display text-lg font-medium tracking-[-0.03em] sm:text-xl">{legend}</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        {options.map((option) => (
          <label key={option.value} className="pill-option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-describedby={`${name}-${option.value}-hint`}
              className="sr-only"
            />
            <span className="pill-title">{option.label}</span>
            <span id={`${name}-${option.value}-hint`} className="pill-hint">
              {option.hint}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
