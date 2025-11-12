export default function Input({ label, type="text", value, onChange, placeholder }) {
    return (
      <div className="mb-4">
        <label className="block mb-1 text-gray-700 font-medium">{label}</label>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
    );
  }
  