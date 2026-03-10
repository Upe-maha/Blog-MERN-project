interface ButtonProps {
    children: React.ReactNode;
    type?: "button" | "submit" | "reset";
    variant?: "primary" | "secondary" | "danger" | "outline";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    className?: string;
}

const Button = ({
    children,
    type = "button",
    variant = "primary",
    size = "md",
    disabled = false,
    loading = false,
    onClick,
    className = "",
}: ButtonProps) => {
    const variantClasses = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700",
        secondary: "bg-gray-600 text-white hover:bg-gray-700",
        danger: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-indigo-600 text-indigo-600 hover:bg-indigo-50",
    };

    const sizeClasses = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2",
        lg: "px-6 py-3 text-lg",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                rounded-lg font-semibold transition
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
            `}
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Loading...
                </span>
            ) : (
                children
            )}
        </button>
    );
};

export default Button;
