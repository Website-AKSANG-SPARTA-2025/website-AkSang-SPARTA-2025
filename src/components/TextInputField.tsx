import React from "react";

interface TextInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function TextInputField({
  label,
  ...props
}: TextInputFieldProps) {
  return (
    <div className="w-full">
      <label className="block text-[#0D1027] font-extrabold font-jetbrains mb-2 tracking-[-0.1em]">
        {label}
      </label>
      <input
        className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-jetbrains tracking-[-0.1em] focus:ring-2 focus:ring-primary outline-none transition-all text-[#0D1027]"
        {...props}
      />
    </div>
  );
}
