interface InputProps {
    label?: string;
    type?: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    error?: string;
    disabled?: boolean;
}

const Input = ({
    label,
    type = "text",
    name,
    value,
    onChange,
    placeholder,
    required = false,
    error,
    disabled = false,
}: InputProps) => {
    return (
        <div className="mb-4">
            {label && (
                <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type={type}
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className={`
                    w-full px-4 py-3 border rounded-lg outline-none transition
                    focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    ${error ? "border-red-500" : "border-gray-300"}
                `}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
};

export default Input;
