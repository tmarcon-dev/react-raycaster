import { ReactNode } from "react";

type ToggleProps = {
  id: string;
  label: string;
  icon: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

// Icon checkbox shared by both demo pages
function Toggle({ id, label, icon, checked, onChange }: ToggleProps) {
  return (
    <div>
      <label htmlFor={id} title={label}>
        {icon}
      </label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        id={id}
        aria-label={label}
      />
    </div>
  );
}

export default Toggle;
