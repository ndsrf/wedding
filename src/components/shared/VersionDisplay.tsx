import packageJson from '@/../package.json';

export function VersionDisplay() {
  return (
    <footer className="mt-auto py-6 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-gray-400">
          v{packageJson.version}
        </p>
      </div>
    </footer>
  );
}
