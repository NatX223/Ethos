interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "accent";
}

export function Button({ children, className = "", isLoading = false, variant = "primary", ...props }: ButtonProps) {
  const baseStyles = "w-full max-w-xs mx-auto block py-3 px-6 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20",
    secondary: "bg-accent2 text-white hover:bg-accent2/90 hover:shadow-lg hover:shadow-accent2/20",
    outline: "border-2 border-primary text-primary hover:bg-primary/10",
    accent: "bg-accent1 text-text hover:bg-accent1/90 hover:shadow-lg hover:shadow-accent1/20"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
        </div>
      ) : (
        children
      )}
    </button>
  );
}
