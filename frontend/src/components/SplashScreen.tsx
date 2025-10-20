export function SplashScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-semibold text-primary">Timeline</p>
      </div>
    </div>
  );
} 