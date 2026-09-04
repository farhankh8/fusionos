import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#FBF5EC]">
      <div className="text-center">
        <p className="text-[72px] font-bold text-[#064E3B]">404</p>
        <h1 className="mt-2 text-[18px] font-semibold text-[#1C1917]">
          Page Not Found
        </h1>
        <p className="mt-2 text-[14px] text-[#57534E]">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-[6px] bg-[#064E3B] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#047857] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
