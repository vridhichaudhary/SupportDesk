export default function Button({ text, onClick }) {
    return (
      <button
        onClick={onClick}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
      >
        {text}
      </button>
    );
  }
  