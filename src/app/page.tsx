export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Wedding Management System
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Multi-tenant wedding management platform
        </p>
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            <p>Platform for wedding planners, admins, and guests</p>
            <p>Featuring RSVP tracking, payment management, and multi-language support</p>
          </div>
        </div>
      </div>
    </div>
  )
}
