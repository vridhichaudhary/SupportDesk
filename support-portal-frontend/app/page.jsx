import LoginPage from "./login/page";
import SignupPage from "./signup/page";

export default function Home() {
    return (
      <div className="flex items-center justify-center h-screen">
        <SignupPage/>
        {/* <LoginPage/> */}
      </div>
    );
  }
  