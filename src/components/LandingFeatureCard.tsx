interface LandingFeatureCardProps {
  title: string;
  description: string;
  iconPaths: string[];
  bg: string;
  border: string;
  iconGradient: string;
}

export default function LandingFeatureCard({
  title,
  description,
  iconPaths,
  bg,
  border,
  iconGradient,
}: LandingFeatureCardProps) {
  return (
    <div className={`p-8 rounded-2xl bg-gradient-to-br ${bg} hover:shadow-xl transition-shadow border ${border}`}>
      <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${iconGradient} flex items-center justify-center mb-6`}>
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {iconPaths.map((d, i) => (
            <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
          ))}
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
