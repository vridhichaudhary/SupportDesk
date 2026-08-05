import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorCard({ error, onRetry }) {
  if (!error) return null;
  
  // Try to parse the error if it's an object/Axios error
  let title = "Error";
  let message = typeof error === 'string' ? error : "An unexpected error occurred.";
  let status = null;

  if (error?.isAxiosError) {
    status = error.response?.status;
    message = error.response?.data?.detail || error.response?.data?.error?.message || error.message || message;
    
    if (status === 401) {
      title = "Unauthorized (401)";
      message = "You must be logged in to access this resource.";
    } else if (status === 403) {
      title = "Forbidden (403)";
      message = "You do not have permission to view this resource.";
    } else if (status === 404) {
      title = "Not Found (404)";
      message = "The requested resource could not be found.";
    } else if (status === 500) {
      title = "Server Error (500)";
      message = "An internal server error occurred. Please try again later.";
    } else if (error.code === 'ERR_NETWORK') {
      title = "Network Error";
      message = "Unable to connect to the server. Please check if the backend is running.";
    } else if (error.code === 'ECONNABORTED') {
      title = "Timeout Error";
      message = "The request took too long and timed out.";
    }
  } else if (typeof error === 'object' && error.message) {
    message = error.message;
  }

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <AlertCircle className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-rose-900">{title}</h3>
          <p className="text-sm text-rose-700 mt-1">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white text-rose-700 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 hover:text-rose-800 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
      )}
    </div>
  );
}
