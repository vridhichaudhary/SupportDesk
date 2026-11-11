export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-sky-100 selection:text-sky-900 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}