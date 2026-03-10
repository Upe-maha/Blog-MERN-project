interface LoadingProps {
    text?: string;
    size?: "sm" | "md" | "lg";
}

const Loading = ({ text = "Loading...", size = "md" }: LoadingProps) => {
    const sizeClasses = {
        sm: "w-8 h-8 border-2",
        md: "w-12 h-12 border-4",
        lg: "w-16 h-16 border-4",
    };

    return (
        <div className="flex flex-col items-center justify-center py-10">
            <div
                className={`${sizeClasses[size]} border-indigo-600 border-t-transparent rounded-full animate-spin mb-4`}
            ></div>
            <p className="text-gray-600">{text}</p>
        </div>
    );
};

export default Loading;
