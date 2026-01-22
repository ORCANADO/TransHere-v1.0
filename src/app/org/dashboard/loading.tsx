export default function OrganizationLoading() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
        </div>
    );
}
