import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
            <p className="text-xl text-gray-500 mb-6">Page not found</p>
            <Link to="/" className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
                Go to Dashboard
            </Link>
        </div>
    );
}
