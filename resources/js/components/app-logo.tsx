import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <div className="flex items-center gap-3">
            <AppLogoIcon className="size-10" />
            <div className="flex flex-col leading-tight">
                <span className="text-base font-bold tracking-tight text-foreground">
                    Sales System
                </span>
                <span className="text-xs text-muted-foreground">
                    Internal Dashboard
                </span>
            </div>
        </div>
    );
}