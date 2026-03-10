interface AlertProps {
    type: "success" | "error" | "warning" | "info";
    message: string;
    onClose?: () => void;
}

const Alert = ({ type, message, onClose }: AlertProps) => {
    const typeClasses = {
        success: "bg-green-50 border-green-200 text-green-600",
        error: "bg-red-50 border-red-200 text-red-600",
        warning: "bg-yellow-50 border-yellow-200 text-yellow-600",
        info: "bg-blue-50 border-blue-200 text-blue-600",
    };

    const icons = {
        success: "✓",
        error: "✕",
        warning: "⚠",
        info: "ℹ",
    };

    return (
        <div className={`${typeClasses[type]} border px-4 py-3 rounded-lg flex items-center justify-between`}>
            <div className="flex items-center gap-2">
                <span className="font-bold">{icons[type]}</span>
                <span>{message}</span>
            </div>
            {onClose && (
                <button onClick={onClose} className="hover:opacity-70">
                    ✕
                </button>
            )}
        </div>
    );
};

export default Alert;
