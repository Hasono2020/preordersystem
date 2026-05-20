export default function AppLogoIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            width="40"
            height="40"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Background */}
            <rect width="64" height="64" rx="14" fill="#0EA5E9" />

            {/* Roof */}
            <path d="M14 30l18-16 18 16" fill="white" fillOpacity="0.95" />

            {/* Building body */}
            <rect x="16" y="30" width="32" height="22" rx="3" fill="white" fillOpacity="0.95" />

            {/* Door */}
            <rect x="27" y="38" width="10" height="14" rx="2" fill="#0EA5E9" />

            {/* Chart arrow going up */}
            <path
                d="M20 46l5-6 4 4 9-10"
                stroke="#0EA5E9"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            {/* Arrow tip */}
            <path
                d="M35 34l3-1-1 3"
                stroke="#0EA5E9"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}